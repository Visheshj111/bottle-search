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
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  }

  const apps = [
    {
      name: "Notes",
      icon: "📝",
      description: "Quick thoughts & ideas",
      path: "/notes",
    },
    {
      name: "Expenses",
      icon: "💳",
      description: "Track spending",
      path: "/expenses",
    },
    {
      name: "Tasks",
      icon: "☑️",
      description: "Get things done",
      path: "/tasks",
    },
    {
      name: "Search",
      icon: "🔍",
      description: "Find anything",
      path: "/search",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ 
        padding: "16px 24px", 
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>⚡</span>
          <span style={{ fontWeight: "600", fontSize: "15px" }}>bottleup</span>
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          Personal Dashboard
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "60px 24px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        
        {/* Quote Section */}
        <div className="animate-fade-in" style={{ marginBottom: "48px", textAlign: "center" }}>
          {quote ? (
            <>
              <p style={{ 
                fontSize: "24px", 
                fontWeight: "400", 
                margin: "0 0 12px 0", 
                lineHeight: 1.4,
                color: "var(--text-primary)"
              }}>
                "{quote.text}"
              </p>
              <p style={{ 
                fontSize: "13px", 
                color: "var(--text-muted)", 
                margin: 0,
                fontWeight: "500"
              }}>
                — {quote.author}
              </p>
            </>
          ) : (
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Loading...</p>
          )}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="animate-fade-in" style={{ marginBottom: "48px" }}>
          <div style={{ 
            display: "flex", 
            gap: "8px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "4px"
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Google, YouTube, Reddit..."
              style={{
                flex: 1,
                padding: "12px 16px",
                fontSize: "14px",
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                outline: "none"
              }}
            />
            <button
              type="submit"
              className="glass-button"
              style={{
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: "500"
              }}
            >
              Search
            </button>
          </div>
        </form>

        {/* Apps Grid */}
        <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 style={{ 
            fontSize: "13px", 
            fontWeight: "500", 
            color: "var(--text-muted)", 
            marginBottom: "16px",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            Apps
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px"
          }}>
            {apps.map((app) => (
              <div
                key={app.name}
                onClick={() => navigate(app.path)}
                className="glass-panel hover-scale"
                style={{
                  padding: "20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px"
                }}
              >
                <div style={{ 
                  fontSize: "24px",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--bg-secondary)",
                  borderRadius: "8px"
                }}>
                  {app.icon}
                </div>
                <div>
                  <h3 style={{ margin: "0 0 2px 0", fontSize: "14px", fontWeight: "500" }}>
                    {app.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
                    {app.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ 
        padding: "24px", 
        textAlign: "center", 
        fontSize: "12px", 
        color: "var(--text-muted)",
        borderTop: "1px solid var(--border-color)"
      }}>
        Built with ☕ • {new Date().getFullYear()}
      </footer>
    </div>
  );
}
