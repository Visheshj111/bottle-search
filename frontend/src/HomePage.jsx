import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const WORKER_URL = process.env.REACT_APP_WORKER_URL || "http://127.0.0.1:8787";

export default function HomePage() {
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const cardRefs = useRef([]);

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

  function handleCardMouseMove(e, index) {
    const card = cardRefs.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#000" }}>
      {/* Header */}
      <header style={{ 
        padding: "16px 24px", 
        borderBottom: "1px solid #1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ 
            width: "28px", 
            height: "28px", 
            background: "linear-gradient(135deg, #fff, #888)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px"
          }}>
            ⚡
          </div>
          <span style={{ fontWeight: "600", fontSize: "16px", letterSpacing: "-0.3px" }}>bottleup</span>
        </div>
        <div style={{ fontSize: "13px", color: "#666" }}>
          Personal Dashboard
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "80px 24px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        
        {/* Quote Section */}
        <div className="blur-text" style={{ marginBottom: "60px", textAlign: "center" }}>
          {quote ? (
            <>
              <p className="gradient-text" style={{ 
                fontSize: "28px", 
                fontWeight: "500", 
                margin: "0 0 16px 0", 
                lineHeight: 1.4,
                letterSpacing: "-0.5px"
              }}>
                "{quote.text}"
              </p>
              <p style={{ 
                fontSize: "13px", 
                color: "#555", 
                margin: 0,
                fontWeight: "500"
              }}>
                — {quote.author}
              </p>
            </>
          ) : (
            <div className="shimmer" style={{ height: "40px", borderRadius: "8px", maxWidth: "400px", margin: "0 auto" }} />
          )}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="animate-fade-up" style={{ marginBottom: "60px" }}>
          <div style={{ 
            display: "flex", 
            gap: "8px",
            background: "#111",
            border: "1px solid #222",
            borderRadius: "12px",
            padding: "6px",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)"
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              paddingLeft: "12px",
              color: "#444"
            }}>
              🔍
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Google, YouTube, Reddit..."
              style={{
                flex: 1,
                padding: "14px 8px",
                fontSize: "15px",
                background: "transparent",
                border: "none",
                color: "#fff",
                outline: "none"
              }}
            />
            <button
              type="submit"
              style={{
                padding: "14px 28px",
                fontSize: "14px",
                fontWeight: "600",
                background: "#fff",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              Search
            </button>
          </div>
        </form>

        {/* Apps Grid */}
        <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <h2 style={{ 
            fontSize: "12px", 
            fontWeight: "600", 
            color: "#555", 
            marginBottom: "20px",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            Quick Access
          </h2>
          <div className="stagger-children" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px"
          }}>
            {apps.map((app, index) => (
              <div
                key={app.name}
                ref={el => cardRefs.current[index] = el}
                onClick={() => navigate(app.path)}
                onMouseMove={(e) => handleCardMouseMove(e, index)}
                className="spotlight-card"
                style={{
                  padding: "24px 20px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              >
                <div style={{ 
                  fontSize: "28px",
                  width: "48px",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#1a1a1a",
                  borderRadius: "10px",
                  border: "1px solid #2a2a2a"
                }}>
                  {app.icon}
                </div>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600" }}>
                    {app.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
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
        color: "#444",
        borderTop: "1px solid #111"
      }}>
        Built with ☕ • {new Date().getFullYear()}
      </footer>
    </div>
  );
}
