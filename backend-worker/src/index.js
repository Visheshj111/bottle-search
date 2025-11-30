// backend-worker/src/index.js

// Chatbot handler using OpenAI or Groq API (PRO ONLY)
async function handleChat(request, env, jsonHeaders) {
  try {
    const body = await request.json();
    const { question, context, isPro } = body;

    // Check if user is pro
    if (!isPro) {
      return new Response(
        JSON.stringify({ 
          error: "Pro subscription required",
          message: "AI Assistant is available for Pro users only. Upgrade to access this feature!"
        }),
        { status: 403, headers: jsonHeaders }
      );
    }

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
      const isPro = url.searchParams.get("pro") === "true"; // Check if user is pro
      
      if (!q || q.trim().length < 2) {
        return new Response(JSON.stringify({ error: "query required" }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const normalized = q.trim().toLowerCase();
      const cacheKey = `search:${normalized}:${isPro ? 'pro' : 'free'}`;

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

      // --- Google Custom Search (PRO ONLY) ---
      const googlePromise = (async () => {
        // Skip Google search for free users
        if (!isPro) {
          console.log("[DEBUG] Skipping Google search - free tier");
          return { google: [], proOnly: true };
        }

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

      // Google (PRO ONLY)
      if (all[2].status === "fulfilled") {
        if (all[2].value.google) {
          results.google = all[2].value.google;
          if (all[2].value.proOnly) {
            results.googleProOnly = true;
          }
        } else {
          results.googleError = all[2].value;
        }
      } else {
        results.googleError = String(all[2].reason);
      }

      // Add tier info to response
      results.tier = isPro ? "pro" : "free";

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
