import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const WORKER_URL = process.env.REACT_APP_WORKER_URL || "http://127.0.0.1:8787";
const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api';

// Default quick links
const DEFAULT_QUICK_LINKS = [
  { name: "Instagram", url: "https://instagram.com", icon: "📷" },
  { name: "Twitter", url: "https://twitter.com", icon: "🐦" },
  { name: "YouTube", url: "https://youtube.com", icon: "▶️" },
  { name: "GitHub", url: "https://github.com", icon: "💻" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const cardRefs = useRef([]);
  const [quickLinks, setQuickLinks] = useState(() => {
    const saved = localStorage.getItem('quickLinks');
    return saved ? JSON.parse(saved) : DEFAULT_QUICK_LINKS;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLink, setNewLink] = useState({ name: "", url: "", icon: "🔗" });
  
  // Local search state
  const [localResults, setLocalResults] = useState({ notes: [], tasks: [], expenses: [] });
  const [showLocalResults, setShowLocalResults] = useState(false);
  const searchTimeoutRef = useRef(null);

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
    setShowLocalResults(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  }

  // Search local data (notes, tasks, expenses)
  async function searchLocalData(query) {
    if (!query.trim() || query.length < 2) {
      setLocalResults({ notes: [], tasks: [], expenses: [] });
      setShowLocalResults(false);
      return;
    }

    const q = query.toLowerCase();

    try {
      const [notesRes, tasksRes, expensesRes] = await Promise.allSettled([
        fetch(`${API_URL}/notes`).then(r => r.ok ? r.json() : []),
        fetch(`${API_URL}/tasks`).then(r => r.ok ? r.json() : []),
        fetch(`${API_URL}/expenses`).then(r => r.ok ? r.json() : [])
      ]);

      const notes = (notesRes.status === 'fulfilled' ? notesRes.value : [])
        .filter(n => n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q))
        .slice(0, 3);

      const tasks = (tasksRes.status === 'fulfilled' ? tasksRes.value : [])
        .filter(t => t.text?.toLowerCase().includes(q))
        .slice(0, 3);

      const expenses = (expensesRes.status === 'fulfilled' ? expensesRes.value : [])
        .filter(e => e.title?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q))
        .slice(0, 3);

      setLocalResults({ notes, tasks, expenses });
      setShowLocalResults(notes.length > 0 || tasks.length > 0 || expenses.length > 0);
    } catch (err) {
      console.error('Local search error:', err);
    }
  }

  function handleSearchInputChange(e) {
    const value = e.target.value;
    setSearchQuery(value);

    // Debounce local search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchLocalData(value);
    }, 300);
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

  function saveQuickLinks(links) {
    setQuickLinks(links);
    localStorage.setItem('quickLinks', JSON.stringify(links));
  }

  function handleAddLink(e) {
    e.preventDefault();
    if (!newLink.name.trim() || !newLink.url.trim()) return;
    
    let url = newLink.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const updatedLinks = [...quickLinks, { ...newLink, url }];
    saveQuickLinks(updatedLinks);
    setNewLink({ name: "", url: "", icon: "🔗" });
    setShowAddModal(false);
  }

  function removeQuickLink(index) {
    const updatedLinks = quickLinks.filter((_, i) => i !== index);
    saveQuickLinks(updatedLinks);
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
        <form onSubmit={handleSearch} className="animate-fade-up" style={{ marginBottom: "40px", position: "relative" }}>
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
              onChange={handleSearchInputChange}
              onFocus={() => searchQuery.length >= 2 && searchLocalData(searchQuery)}
              onBlur={() => setTimeout(() => setShowLocalResults(false), 300)}
              placeholder="Search Google, YouTube, Reddit, Notes, Tasks..."
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

          {/* Local Search Results Dropdown */}
          {showLocalResults && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: "8px",
              background: "#111",
              border: "1px solid #222",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              zIndex: 100,
              overflow: "hidden"
            }}>
              {/* Notes Results */}
              {localResults.notes.length > 0 && (
                <div>
                  <div style={{ 
                    padding: "10px 16px", 
                    fontSize: "11px", 
                    color: "#666", 
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontWeight: "600",
                    background: "#0a0a0a"
                  }}>
                    📝 Notes
                  </div>
                  {localResults.notes.map(note => (
                    <div
                      key={note._id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigate('/notes');
                      }}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderBottom: "1px solid #1a1a1a",
                        transition: "background 0.1s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#1a1a1a"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "2px" }}>{note.title}</div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {note.content?.slice(0, 60)}{note.content?.length > 60 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tasks Results */}
              {localResults.tasks.length > 0 && (
                <div>
                  <div style={{ 
                    padding: "10px 16px", 
                    fontSize: "11px", 
                    color: "#666", 
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontWeight: "600",
                    background: "#0a0a0a"
                  }}>
                    ☑️ Tasks
                  </div>
                  {localResults.tasks.map(task => (
                    <div
                      key={task._id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigate('/tasks');
                      }}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderBottom: "1px solid #1a1a1a",
                        transition: "background 0.1s",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#1a1a1a"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ 
                        color: task.completed ? "#00d084" : "#666",
                        fontSize: "14px"
                      }}>
                        {task.completed ? "✓" : "○"}
                      </span>
                      <span style={{ 
                        fontSize: "14px",
                        textDecoration: task.completed ? "line-through" : "none",
                        color: task.completed ? "#666" : "#fff"
                      }}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Expenses Results */}
              {localResults.expenses.length > 0 && (
                <div>
                  <div style={{ 
                    padding: "10px 16px", 
                    fontSize: "11px", 
                    color: "#666", 
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontWeight: "600",
                    background: "#0a0a0a"
                  }}>
                    💳 Expenses
                  </div>
                  {localResults.expenses.map(expense => (
                    <div
                      key={expense._id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigate('/expenses');
                      }}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderBottom: "1px solid #1a1a1a",
                        transition: "background 0.1s",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#1a1a1a"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "500" }}>{expense.title}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>{expense.category}</div>
                      </div>
                      <div style={{ fontSize: "14px", color: "#ff6b6b", fontWeight: "500" }}>
                        -${expense.amount?.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search Web hint */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSearch({ preventDefault: () => {} });
                }}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  background: "#0a0a0a",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#888",
                  fontSize: "13px"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#1a1a1a"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#0a0a0a"}
              >
                <span>🌐</span>
                <span>Search web for "<strong style={{ color: "#fff" }}>{searchQuery}</strong>"</span>
                <span style={{ marginLeft: "auto", fontSize: "11px" }}>↵ Enter</span>
              </div>
            </div>
          )}
        </form>

        {/* Quick Links */}
        <div className="animate-fade-up" style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ 
              fontSize: "12px", 
              fontWeight: "600", 
              color: "#555", 
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}>
              Quick Links
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                color: "#888",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              + Add
            </button>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {quickLinks.map((link, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#111",
                  border: "1px solid #222",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#333";
                  e.currentTarget.querySelector('.remove-btn').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#222";
                  e.currentTarget.querySelector('.remove-btn').style.opacity = '0';
                }}
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    textDecoration: "none",
                    color: "#fff"
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{link.icon}</span>
                  <span style={{ fontSize: "13px", fontWeight: "500" }}>{link.name}</span>
                </a>
                <button
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeQuickLink(idx);
                  }}
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#333",
                    border: "none",
                    color: "#888",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.15s"
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add Link Modal */}
        {showAddModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000
            }}
            onClick={() => setShowAddModal(false)}
          >
            <div
              style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: "12px",
                padding: "24px",
                width: "100%",
                maxWidth: "360px"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "600" }}>Add Quick Link</h3>
              <form onSubmit={handleAddLink}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "6px" }}>Icon (emoji)</label>
                  <input
                    type="text"
                    value={newLink.icon}
                    onChange={(e) => setNewLink({ ...newLink, icon: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "#0a0a0a",
                      border: "1px solid #222",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "14px",
                      outline: "none"
                    }}
                    placeholder="🔗"
                  />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "6px" }}>Name</label>
                  <input
                    type="text"
                    value={newLink.name}
                    onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "#0a0a0a",
                      border: "1px solid #222",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "14px",
                      outline: "none"
                    }}
                    placeholder="Instagram"
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#666", marginBottom: "6px" }}>URL</label>
                  <input
                    type="text"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "#0a0a0a",
                      border: "1px solid #222",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "14px",
                      outline: "none"
                    }}
                    placeholder="instagram.com"
                  />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "transparent",
                      border: "1px solid #333",
                      borderRadius: "6px",
                      color: "#888",
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      color: "#000",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Add Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
