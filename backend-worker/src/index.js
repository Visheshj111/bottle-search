// backend-worker/src/index.js

// Chatbot handler using OpenAI or Groq API
async function handleChat(request, env, jsonHeaders) {
  try {
    const body = await request.json();
    const { question, context } = body;

    if (!question) {
      return new Response(
        JSON.stringify({ error: "question required" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const apiKey = env.OPENAI_API_KEY || env.GROQ_API_KEY;
    const useGroq = Boolean(env.GROQ_API_KEY);
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI API key not configured" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // Build context from search results
    let contextText = `User's search query: "${context.query}"\n\n`;
    
    if (context.videos?.length > 0) {
      contextText += "Top video solutions:\n";
      context.videos.forEach((v, i) => {
        contextText += `${i + 1}. ${v.title} by ${v.channelTitle}\n   ${v.description?.slice(0, 150)}\n`;
      });
      contextText += "\n";
    }

    if (context.google?.length > 0) {
      contextText += "Top web results:\n";
      context.google.forEach((g, i) => {
        contextText += `${i + 1}. ${g.title}\n   ${g.snippet}\n`;
      });
      contextText += "\n";
    }

    if (context.reddit?.length > 0) {
      contextText += "Reddit discussions:\n";
      context.reddit.forEach((r, i) => {
        contextText += `${i + 1}. r/${r.subreddit}: ${r.title}\n   ${r.selftext?.slice(0, 150)}\n`;
      });
    }

    const messages = [
      {
        role: "system",
        content: "You are a friendly, conversational AI assistant. Talk naturally like a human would - be direct, casual, and helpful. Don't start responses with phrases like 'It seems like' or 'Based on'. Just answer naturally. If the user says hi, say hi back briefly. Keep responses concise unless they ask for detail. You have access to search results for context when relevant."
      },
      {
        role: "user",
        content: `${contextText}\n\nQuestion: ${question}`
      }
    ];

    const apiUrl = useGroq 
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    console.log("[DEBUG] Using", useGroq ? "Groq" : "OpenAI", "API");
    console.log("[DEBUG] API URL:", apiUrl);
    console.log("[DEBUG] API Key length:", apiKey ? apiKey.length : 0);

    const aiResp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: useGroq ? "llama-3.1-8b-instant" : "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    console.log("[DEBUG] AI API response status:", aiResp.status);

    if (!aiResp.ok) {
      const errorText = await aiResp.text();
      console.error("[DEBUG] AI API error status:", aiResp.status);
      console.error("[DEBUG] AI API error body:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "AI service error", 
          status: aiResp.status,
          details: errorText 
        }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const aiData = await aiResp.json();
    const response = aiData.choices?.[0]?.message?.content || "No response generated";

    return new Response(
      JSON.stringify({ response }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (err) {
    console.error("Chat error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", message: String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      const jsonHeaders = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      // Handle CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: jsonHeaders });
      }

      // Chatbot endpoint
      if (url.pathname === "/chat" && request.method === "POST") {
        return handleChat(request, env, jsonHeaders);
      }

      // Quote endpoint
      if (url.pathname === "/quote") {
        try {
          // Fetch from ZenQuotes API (free, no auth required)
          const quoteResp = await fetch("https://zenquotes.io/api/today");
          const quoteData = await quoteResp.json();
          
          if (quoteData && quoteData[0]) {
            return new Response(
              JSON.stringify({
                text: quoteData[0].q,
                author: quoteData[0].a,
              }),
              { status: 200, headers: jsonHeaders }
            );
          }
          
          // Fallback quote
          return new Response(
            JSON.stringify({
              text: "The only way to do great work is to love what you do.",
              author: "Steve Jobs",
            }),
            { status: 200, headers: jsonHeaders }
          );
        } catch (err) {
          console.error("Quote fetch error:", err);
          return new Response(
            JSON.stringify({
              text: "Believe you can and you're halfway there.",
              author: "Theodore Roosevelt",
            }),
            { status: 200, headers: jsonHeaders }
          );
        }
      }

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
        images: [],
        linkedin: [],
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
        // use Reddit search endpoint with proper headers to avoid blocking
        const redditQuery = encodeURIComponent(q);
        const redditUrl = `https://www.reddit.com/search.json?q=${redditQuery}&sort=relevance&limit=6&raw_json=1`;
        try {
          const r = await fetch(redditUrl, { 
            headers: { 
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "application/json",
              "Accept-Language": "en-US,en;q=0.9"
            } 
          });
          console.log("[DEBUG] Reddit response status:", r.status);
          if (!r.ok) {
            const txt = await r.text();
            console.error("[DEBUG] Reddit error:", txt.substring(0, 200));
            return { error: "Reddit fetch error", status: r.status, details: txt };
          }
          const j = await r.json();
          console.log("[DEBUG] Reddit posts found:", j.data?.children?.length || 0);
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
          console.error("[DEBUG] Reddit error:", String(err));
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

      // --- Google Images Search ---
      const imagesPromise = (async () => {
        const apiKey = env.GOOGLE_API_KEY;
        const searchEngineId = env.GOOGLE_CX;
        
        if (!apiKey || !searchEngineId) {
          return { error: "Google API key or CX not set" };
        }

        const params = new URLSearchParams({
          key: apiKey,
          cx: searchEngineId,
          q: q,
          searchType: "image",
          num: "8",
        });
        const imagesUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
        console.log("[DEBUG] Fetching Google Images...");

        try {
          const r = await fetch(imagesUrl);
          console.log("[DEBUG] Google Images response status:", r.status);
          if (!r.ok) {
            const txt = await r.text();
            console.error("[DEBUG] Google Images API error:", txt.substring(0, 300));
            return { error: "Google Images API error", status: r.status, details: txt };
          }
          const j = await r.json();
          console.log("[DEBUG] Google Images returned:", j.items?.length || 0);
          const imageResults = (j.items || []).map((item) => {
            return {
              title: item.title,
              link: item.link,
              thumbnail: item.image?.thumbnailLink,
              contextLink: item.image?.contextLink,
              width: item.image?.width,
              height: item.image?.height,
            };
          });
          return { images: imageResults };
        } catch (err) {
          console.error("[DEBUG] Google Images error:", String(err));
          return { error: String(err) };
        }
      })();

      // --- LinkedIn Search (via Google site search) ---
      const linkedinPromise = (async () => {
        const apiKey = env.GOOGLE_API_KEY;
        const searchEngineId = env.GOOGLE_CX;
        
        if (!apiKey || !searchEngineId) {
          return { error: "Google API key or CX not set" };
        }

        const params = new URLSearchParams({
          key: apiKey,
          cx: searchEngineId,
          q: `site:linkedin.com ${q}`,
          num: "6",
        });
        const linkedinUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
        console.log("[DEBUG] Fetching LinkedIn results via Google...");

        try {
          const r = await fetch(linkedinUrl);
          console.log("[DEBUG] LinkedIn search response status:", r.status);
          if (!r.ok) {
            const txt = await r.text();
            console.error("[DEBUG] LinkedIn search error:", txt.substring(0, 300));
            return { error: "LinkedIn search error", status: r.status, details: txt };
          }
          const j = await r.json();
          console.log("[DEBUG] LinkedIn results returned:", j.items?.length || 0);
          const linkedinResults = (j.items || []).map((item) => {
            // Parse LinkedIn profile/post info from URL and title
            const isProfile = item.link?.includes('/in/');
            const isCompany = item.link?.includes('/company/');
            const isPost = item.link?.includes('/posts/') || item.link?.includes('/pulse/');
            
            return {
              title: item.title,
              link: item.link,
              snippet: item.snippet,
              displayLink: item.displayLink,
              type: isProfile ? 'profile' : isCompany ? 'company' : isPost ? 'post' : 'other',
            };
          });
          return { linkedin: linkedinResults };
        } catch (err) {
          console.error("[DEBUG] LinkedIn search error:", String(err));
          return { error: String(err) };
        }
      })();

      // Run all in parallel
      const all = await Promise.allSettled([ytPromise, redditPromise, googlePromise, imagesPromise, linkedinPromise]);

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
        if (all[2].value.google) {
          results.google = all[2].value.google;
        } else {
          results.googleError = all[2].value;
        }
      } else {
        results.googleError = String(all[2].reason);
      }

      // Images
      if (all[3].status === "fulfilled") {
        if (all[3].value.images) {
          results.images = all[3].value.images;
        } else {
          results.imagesError = all[3].value;
        }
      } else {
        results.imagesError = String(all[3].reason);
      }

      // LinkedIn
      if (all[4].status === "fulfilled") {
        if (all[4].value.linkedin) {
          results.linkedin = all[4].value.linkedin;
        } else {
          results.linkedinError = all[4].value;
        }
      } else {
        results.linkedinError = String(all[4].reason);
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
