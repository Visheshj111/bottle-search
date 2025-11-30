import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const WORKER_URL = process.env.REACT_APP_WORKER_URL || "http://127.0.0.1:8787";

export default function HomePage() {
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchQuote();
  }, []);

  async function fetchQuote() {
    try {
      // Fetch motivational quote from API
      const resp = await fetch(`${WORKER_URL}/quote`);
      const data = await resp.json();
      setQuote(data);
    } catch (err) {
      console.error("Failed to fetch quote:", err);
      setQuote({
        text: "The only way to do great work is to love what you do.",
        author: "Steve Jobs",
      });
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Navigate to search page with query
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  }

  const apps = [
    {
      name: "Notes",
      icon: "📝",
      color: "#FF6B6B",
      description: "Notion-style notes",
      path: "/notes",
    },
    {
      name: "Expenses",
      icon: "💰",
      color: "#4ECDC4",
      description: "Track your spending",
      path: "/expenses",
    },
    {
      name: "Tasks",
      icon: "✓",
      color: "#95E1D3",
      description: "Todo & reminders",
      path: "/tasks",
    },
    {
      name: "Search",
      icon: "🔍",
      color: "#F38181",
      description: "Universal search",
      path: "/search",
    },
  ];

  return (
    <div style={{ padding: "40px 20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Motivational Quote */}
        <div className="glass-panel animate-fade-in" style={{ padding: "40px", marginBottom: "60px", textAlign: "center" }}>
          {quote ? (
            <>
              <p style={{ fontSize: "28px", fontWeight: "300", margin: "0 0 16px 0", lineHeight: 1.4 }}>
                "{quote.text}"
              </p>
              <p style={{ fontSize: "16px", color: "var(--text-muted)", margin: 0, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>
                — {quote.author}
              </p>
            </>
          ) : (
            <p style={{ fontSize: "18px", color: "var(--text-muted)" }}>Loading inspiration...</p>
          )}
        </div>

        {/* Universal Search Bar */}
        <form onSubmit={handleSearch} style={{ marginBottom: "60px" }} className="animate-fade-in">
          <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
            <input
              type="text"
              className="glass-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anything... (Google, YouTube, Reddit, AI)"
              style={{
                width: "100%",
                padding: "24px 70px 24px 32px",
                fontSize: "20px",
                borderRadius: "50px",
                boxSizing: "border-box"
              }}
            />
            <button
              type="submit"
              className="glass-button"
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                borderRadius: "50%",
                width: 48,
                height: 48,
                fontSize: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              🔍
            </button>
          </div>
        </form>

        {/* App Grid */}
        <div
          className="animate-fade-in"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "32px",
            animationDelay: "0.2s"
          }}
        >
          {apps.map((app) => (
            <div
              key={app.name}
              onClick={() => navigate(app.path)}
              className="glass-panel hover-scale"
              style={{
                padding: "40px 32px",
                cursor: "pointer",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "24px", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}>
                {app.icon}
              </div>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "24px", fontWeight: "600" }}>
                {app.name}
              </h3>
              <p style={{ margin: 0, fontSize: "15px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                {app.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 80, textAlign: "center", color: "var(--text-muted)", fontSize: 14, opacity: 0.6 }}>
          <p>BottleUp Personal Dashboard • {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
