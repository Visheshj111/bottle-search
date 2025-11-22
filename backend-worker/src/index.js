// backend-worker/src/index.js
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      const jsonHeaders = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      };

      // Health / root route
      if (url.pathname === "/" && !url.searchParams.has("q")) {
        return new Response("bottleup backend worker ok", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }

      // ignore icons
      if (url.pathname === "/favicon.ico" || url.pathname === "/logo.png") {
        return new Response("Not found", { status: 404 });
      }

      const q = url.searchParams.get("q") || "";
      if (!q || q.trim().length < 2) {
        return new Response(JSON.stringify({ error: "query required" }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const normalized = q.trim().toLowerCase();
      const cacheKey = `search:${normalized}`;

      // Try KV cache
      try {
        const cached = await env.SEARCH_CACHE.get(cacheKey);
        if (cached) {
          return new Response(cached, {
            status: 200,
            headers: jsonHeaders,
          });
        }
      } catch (e) {
        console.warn("KV get failed:", String(e));
      }

      // Prepare parallel fetches
      const results = {
        query: q,
        fetchedAt: new Date().toISOString(),
        videos: [],
        reddit: [],
        google: [],
      };

      // --- YouTube ---
      const ytPromise = (async () => {
        const apiKey = env.YT_API_KEY;
        console.log("[DEBUG] YT_API_KEY present?", Boolean(apiKey));
        console.log("[DEBUG] YT_API_KEY length:", apiKey ? apiKey.length : 0);
        if (!apiKey) return { error: "YT API key not set" };

        const params = new URLSearchParams({
          part: "snippet",
          q: q,
          maxResults: "6",
          type: "video",
          safeSearch: "none",
          key: apiKey,
        });
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
        console.log("[DEBUG] Fetching YouTube with URL:", ytUrl.substring(0, 100) + "...");

        try {
          const r = await fetch(ytUrl);
          console.log("[DEBUG] YouTube response status:", r.status);
          if (!r.ok) {
            const txt = await r.text();
            console.error("[DEBUG] YouTube API error response:", txt.substring(0, 300));
            return { error: "YouTube API error", status: r.status, details: txt };
          }
          const j = await r.json();
          console.log("[DEBUG] YouTube API returned items count:", j.items?.length || 0);
          const vids = (j.items || []).map((it) => {
            const videoId = it.id?.videoId;
            const s = it.snippet || {};
            return {
              videoId,
              title: s.title,
              description: s.description,
              channelTitle: s.channelTitle,
              publishedAt: s.publishedAt,
              thumbnails: s.thumbnails,
              url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
            };
          });
          console.log("[DEBUG] Returning", vids.length, "videos");
          return { videos: vids };
        } catch (err) {
          console.error("[DEBUG] YouTube promise error:", String(err));
          return { error: String(err) };
        }
      })();

      // --- Reddit (public JSON) ---
      const redditPromise = (async () => {
        // use Reddit search endpoint (pushshift used to be an option; here we use reddit search)
        // We'll hit reddit.com/search.json which returns recent posts. Rate-limited but free.
        const redditQuery = encodeURIComponent(q);
        const redditUrl = `https://www.reddit.com/search.json?q=${redditQuery}&sort=relevance&limit=6`;
        try {
          const r = await fetch(redditUrl, { headers: { "User-Agent": "bottleup/1.0" } });
          if (!r.ok) {
            const txt = await r.text();
            return { error: "Reddit fetch error", status: r.status, details: txt };
          }
          const j = await r.json();
          const posts = (j.data?.children || []).map((c) => {
            const d = c.data || {};
            return {
              id: d.id,
              title: d.title,
              subreddit: d.subreddit,
              score: d.score,
              num_comments: d.num_comments,
              created_utc: d.created_utc,
              url: d.url,
              permalink: d.permalink ? `https://reddit.com${d.permalink}` : null,
              selftext: d.selftext?.slice(0, 400) || "",
            };
          });
          return { reddit: posts };
        } catch (err) {
          return { error: String(err) };
        }
      })();

      // --- Google Custom Search ---
      const googlePromise = (async () => {
        const apiKey = env.GOOGLE_API_KEY;
        const searchEngineId = env.GOOGLE_CX;
        console.log("[DEBUG] Google API Key present?", Boolean(apiKey));
        console.log("[DEBUG] Google CX present?", Boolean(searchEngineId));
        
        if (!apiKey || !searchEngineId) {
          return { error: "Google API key or CX not set" };
        }

        const params = new URLSearchParams({
          key: apiKey,
          cx: searchEngineId,
          q: q,
          num: "10",
        });
        const googleUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
        console.log("[DEBUG] Fetching Google Custom Search...");

        try {
          const r = await fetch(googleUrl);
          console.log("[DEBUG] Google response status:", r.status);
          if (!r.ok) {
            const txt = await r.text();
            console.error("[DEBUG] Google API error response:", txt.substring(0, 300));
            return { error: "Google API error", status: r.status, details: txt };
          }
          const j = await r.json();
          console.log("[DEBUG] Google API returned items count:", j.items?.length || 0);
          const webResults = (j.items || []).map((item) => {
            return {
              title: item.title,
              link: item.link,
              snippet: item.snippet,
              displayLink: item.displayLink,
            };
          });
          console.log("[DEBUG] Returning", webResults.length, "Google results");
          return { google: webResults };
        } catch (err) {
          console.error("[DEBUG] Google promise error:", String(err));
          return { error: String(err) };
        }
      })();

      // Run all in parallel
      const all = await Promise.allSettled([ytPromise, redditPromise, googlePromise]);

      // apply results
      // YouTube
      if (all[0].status === "fulfilled") {
        if (all[0].value.videos) results.videos = all[0].value.videos;
        else results.videosError = all[0].value;
      } else {
        results.videosError = String(all[0].reason);
      }

      // Reddit
      if (all[1].status === "fulfilled") {
        if (all[1].value.reddit) results.reddit = all[1].value.reddit;
        else results.redditError = all[1].value;
      } else {
        results.redditError = String(all[1].reason);
      }

      // Google
      if (all[2].status === "fulfilled") {
        if (all[2].value.google) results.google = all[2].value.google;
        else results.googleError = all[2].value;
      } else {
        results.googleError = String(all[2].reason);
      }

      const out = JSON.stringify(results);

      // Cache best-effort with TTL 12 hours
      try {
        await env.SEARCH_CACHE.put(cacheKey, out, { expiration_ttl: 43200 });
      } catch (e) {
        try {
          await env.SEARCH_CACHE.put(cacheKey, out);
        } catch (e2) {
          console.warn("KV put failed:", String(e2));
        }
      }

      return new Response(out, { status: 200, headers: jsonHeaders });
    } catch (err) {
      console.error("Unhandled error:", String(err));
      return new Response(JSON.stringify({ error: "internal", message: String(err) }), {
        status: 500,
        headers: jsonHeaders,
      });
    }
  },
};
