import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const WORKER_URL =
  process.env.REACT_APP_WORKER_URL || "http://127.0.0.1:8787";

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [followUp, setFollowUp] = useState("");
  
  // Chat sidebar state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]); // Array of {role: 'user'|'assistant', content: string}
  const [chatHistory, setChatHistory] = useState([]); // Array of past conversations
  const [currentChatId, setCurrentChatId] = useState(null);
  const chatEndRef = useRef(null);
  
  // Search history state
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bottleup-chat-history');
    if (saved) {
      setChatHistory(JSON.parse(saved));
    }
  }, []);
  
  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bottleup-search-history');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  }, []);
  
  // Save search history to localStorage
  const addToSearchHistory = (query) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(item => item.query.toLowerCase() !== query.toLowerCase());
      // Add to beginning, limit to 20 items
      const newHistory = [
        { query: query.trim(), timestamp: new Date().toISOString() },
        ...filtered
      ].slice(0, 20);
      localStorage.setItem('bottleup-search-history', JSON.stringify(newHistory));
      return newHistory;
    });
  };
  
  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('bottleup-search-history');
  };
  
  const removeFromSearchHistory = (query) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.query !== query);
      localStorage.setItem('bottleup-search-history', JSON.stringify(filtered));
      return filtered;
    });
  };

  // Save chat history to localStorage
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('bottleup-chat-history', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const performSearch = React.useCallback(async (query) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowSearchHistory(false);

    try {
      const url = `${WORKER_URL}/?q=${encodeURIComponent(query)}`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed to fetch");
      setResult(json);
      addToSearchHistory(query); // Save successful search to history
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setQ(query);
      performSearch(query);
    }
  }, [searchParams, performSearch]);

  async function onSearch(e) {
    e && e.preventDefault();
    if (!q.trim()) return;
    performSearch(q);
  }

  async function sendMessage(message) {
    if (!message.trim()) return;
    
    // Add user message
    const userMsg = { role: 'user', content: message };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const url = `${WORKER_URL}/chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: message,
          context: result ? {
            query: result.query,
            videos: result.videos?.slice(0, 3),
            google: result.google?.slice(0, 3),
            reddit: result.reddit?.slice(0, 3),
          } : { query: q || "general question" },
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Failed to get response");
      
      const assistantMsg = { role: 'assistant', content: json.response };
      const finalMessages = [...newMessages, assistantMsg];
      setChatMessages(finalMessages);
      
      // Save to history
      saveChatToHistory(finalMessages);
    } catch (err) {
      const errorMsg = { role: 'assistant', content: "Error: " + String(err) };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  }

  function saveChatToHistory(messages) {
    if (messages.length < 2) return;
    
    const title = messages[0]?.content?.slice(0, 40) + "..." || "New Chat";
    const chat = {
      id: currentChatId || Date.now(),
      title,
      messages,
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => {
      const existing = prev.findIndex(c => c.id === chat.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = chat;
        return updated;
      }
      return [chat, ...prev].slice(0, 20); // Keep last 20 chats
    });
    setCurrentChatId(chat.id);
  }

  function loadChat(chat) {
    setChatMessages(chat.messages);
    setCurrentChatId(chat.id);
  }

  function startNewChat() {
    setChatMessages([]);
    setCurrentChatId(null);
  }

  function deleteChat(chatId) {
    setChatHistory(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      startNewChat();
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Main Content */}
      <div style={{ flex: 1, transition: "margin-right 0.3s ease", marginRight: isChatOpen ? "380px" : "0" }}>
        {/* Header */}
        <header style={{ 
          padding: "12px 24px", 
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: "var(--bg-primary)",
          zIndex: 40
        }}>
          <button
            onClick={() => navigate("/")}
            className="btn-secondary"
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-color)"
            }}
          >
            ← Back
          </button>
          
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: isChatOpen ? "var(--text-primary)" : "transparent",
              color: isChatOpen ? "var(--bg-primary)" : "var(--text-secondary)",
              border: "1px solid var(--border-color)",
              fontWeight: "500"
            }}
          >
            {isChatOpen ? "✕ Close" : "💬 AI Chat"}
          </button>
        </header>

        <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
          {/* Search Box */}
          <div className="animate-fade-in" style={{ marginBottom: "24px" }}>
            <form onSubmit={onSearch} style={{ position: "relative" }}>
              <div style={{ 
                display: "flex", 
                gap: "8px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "4px"
              }}>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setShowSearchHistory(true)}
                  onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
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
                  disabled={loading}
                  type="submit"
                  className="glass-button"
                  style={{ 
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  {loading ? "..." : "Search"}
                </button>
              </div>
                
              {/* Search History Dropdown */}
              {showSearchHistory && searchHistory.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "8px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  zIndex: 100,
                  maxHeight: "250px",
                  overflowY: "auto"
                }}>
                  <div style={{ 
                    padding: "10px 14px", 
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.5px" }}>
                      Recent
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); clearSearchHistory(); }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "11px",
                        padding: "4px 8px"
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  {searchHistory.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        borderBottom: idx < searchHistory.length - 1 ? "1px solid var(--border-color)" : "none"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-card-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setQ(item.query);
                        performSearch(item.query);
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{item.query}</div>
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeFromSearchHistory(item.query);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: "14px",
                          padding: "4px 8px"
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>

          {error && (
            <div style={{ 
              background: "rgba(220, 38, 38, 0.1)", 
              border: "1px solid rgba(220, 38, 38, 0.3)",
              color: "#f87171",
              padding: "12px 16px",
              marginBottom: "20px",
              borderRadius: "8px",
              fontSize: "13px"
            }}>
              {error}
            </div>
          )}

          {result && (
            <div className="animate-fade-in">
              {/* Quick AI Actions */}
              <div style={{ marginBottom: "20px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { text: "Summarize", query: "Summarize the top solutions" },
                  { text: "Ask AI", query: result?.query || q },
                  { text: "Why?", query: "What are the most common causes?" },
                  { text: "How to?", query: "Give me step-by-step instructions" }
                ].map((btn) => (
                  <button
                    key={btn.text}
                    onClick={() => {
                      setIsChatOpen(true);
                      sendMessage(btn.query);
                    }}
                    disabled={chatLoading}
                    style={{
                      padding: "6px 14px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      background: "transparent",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-secondary)",
                      cursor: "pointer"
                    }}
                  >
                    {btn.text}
                  </button>
                ))}
              </div>

              {/* Section Navigation Tabs */}
              <div style={{ 
                display: "flex", 
                gap: "6px", 
                marginBottom: "24px",
                flexWrap: "wrap",
                position: "sticky",
                top: "49px",
                background: "var(--bg-primary)",
                padding: "12px 0",
                zIndex: 30,
                borderBottom: "1px solid var(--border-color)"
              }}>
                {[
                  { id: "videos", label: "Videos", count: result.videos?.length },
                  { id: "images", label: "Images", count: result.images?.length },
                  { id: "google", label: "Web", count: result.google?.length },
                  { id: "linkedin", label: "LinkedIn", count: result.linkedin?.length },
                  { id: "reddit", label: "Reddit", count: result.reddit?.length },
                  { id: "ai", label: "AI Chat", action: () => setIsChatOpen(true) }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.action) {
                        tab.action();
                      } else {
                        document.getElementById(tab.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      background: "transparent",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span style={{ 
                        color: "var(--text-muted)",
                        fontSize: "11px" 
                      }}>
                        {tab.count || 0}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <div style={{ display: "grid", gap: "32px" }}>
                {/* Videos Section */}
                <section id="videos">
                  <h3 style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Videos
                  </h3>
                  <div style={{ display: "grid", gap: "12px" }}>
                    {result.videos?.map((v) => (
                      <div key={v.videoId} className="glass-panel hover-scale" style={{ padding: "12px", display: "flex", gap: "12px" }}>
                        <a href={v.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                          <img
                            src={v.thumbnails?.medium?.url || v.thumbnails?.default?.url}
                            style={{ width: "140px", height: "80px", borderRadius: "6px", objectFit: "cover" }}
                            alt=""
                          />
                        </a>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a href={v.url} target="_blank" rel="noreferrer" style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)", textDecoration: "none", display: "block", marginBottom: "4px" }}>
                            {v.title}
                          </a>
                          <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                            {v.channelTitle}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Google Results */}
                {result.google && result.google.length > 0 && (
                  <section id="google">
                    <h3 style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Web Results
                    </h3>
                    <div style={{ display: "grid", gap: "8px" }}>
                      {result.google?.map((g, idx) => (
                        <div key={idx} className="glass-panel hover-scale" style={{ padding: "14px" }}>
                          <a href={g.link} target="_blank" rel="noreferrer" style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)", textDecoration: "none", display: "block", marginBottom: "4px" }}>
                            {g.title}
                          </a>
                          <div style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "6px" }}>
                            {g.displayLink}
                          </div>
                          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.5 }}>
                            {g.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Images Section */}
                {result.images && result.images.length > 0 && (
                  <section id="images">
                    <h3 style={{ fontSize: "13px", fontWeight: "500", color: "#666", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      🖼️ Images
                    </h3>
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", 
                      gap: "12px" 
                    }}>
                      {result.images?.map((img, idx) => (
                        <a 
                          key={idx} 
                          href={img.link} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ 
                            overflow: "hidden", 
                            borderRadius: "8px",
                            display: "block",
                            textDecoration: "none",
                            background: "#111",
                            border: "1px solid #222",
                            transition: "border-color 0.2s"
                          }}
                        >
                          <img
                            src={img.thumbnail}
                            alt={img.title}
                            style={{ 
                              width: "100%", 
                              height: "120px", 
                              objectFit: "cover",
                              display: "block"
                            }}
                            loading="lazy"
                          />
                          <div style={{ padding: "10px" }}>
                            <p style={{ 
                              margin: 0, 
                              fontSize: "12px", 
                              color: "#888",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                              {img.title}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                {/* Reddit Results */}
                <section id="reddit">
                  <h3 style={{ fontSize: "13px", fontWeight: "500", color: "#666", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    💬 Reddit Discussions
                  </h3>
                  <div style={{ display: "grid", gap: "12px" }}>
                    {result.reddit?.map((r) => (
                      <div key={r.id} style={{ background: "#111", border: "1px solid #222", borderRadius: "8px", padding: "16px" }}>
                        <a href={r.permalink} target="_blank" rel="noreferrer" style={{ fontSize: "15px", fontWeight: "500", color: "#fff", textDecoration: "none", display: "block", marginBottom: "8px" }}>
                          {r.title}
                        </a>
                        <div style={{ color: "#666", fontSize: "12px", marginBottom: "10px" }}>
                          r/{r.subreddit} • {r.score} points • {r.num_comments} comments
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: "#888", lineHeight: 1.6 }}>
                          {r.selftext ? (r.selftext.length > 250 ? r.selftext.slice(0, 250) + "..." : r.selftext) : "No preview available"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* LinkedIn Results */}
                {result.linkedin && result.linkedin.length > 0 && (
                  <section id="linkedin">
                    <h3 style={{ fontSize: "13px", fontWeight: "500", color: "#666", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      💼 LinkedIn
                    </h3>
                    <div style={{ display: "grid", gap: "12px" }}>
                      {result.linkedin?.map((item, idx) => (
                        <div key={idx} style={{ background: "#111", border: "1px solid #222", borderRadius: "8px", padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <span style={{ 
                              fontSize: "10px", 
                              padding: "3px 8px", 
                              borderRadius: "4px", 
                              background: item.type === 'profile' ? '#0a66c2' : item.type === 'company' ? '#057642' : '#666',
                              color: '#fff',
                              textTransform: 'uppercase',
                              fontWeight: '600'
                            }}>
                              {item.type}
                            </span>
                          </div>
                          <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: "15px", fontWeight: "500", color: "#fff", textDecoration: "none", display: "block", marginBottom: "8px" }}>
                            {item.title}
                          </a>
                          <p style={{ margin: 0, fontSize: "13px", color: "#888", lineHeight: 1.6 }}>
                            {item.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Sidebar */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "400px",
          background: "#0a0a0a",
          borderLeft: "1px solid #222",
          display: "flex",
          flexDirection: "column",
          transform: isChatOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease",
          zIndex: 1000
        }}
      >
        {/* Chat Header */}
        <div style={{ 
          padding: "16px", 
          borderBottom: "1px solid #222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
            💬 AI Chat
          </h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={startNewChat}
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              + New
            </button>
            <button
              onClick={() => setIsChatOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "20px",
                padding: "4px"
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Chat History Dropdown */}
        {chatHistory.length > 0 && (
          <div style={{ 
            padding: "8px 16px", 
            borderBottom: "1px solid #1a1a1a",
            maxHeight: "150px",
            overflowY: "auto"
          }}>
            <div style={{ fontSize: "11px", color: "#666", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Previous Chats
            </div>
            {chatHistory.map(chat => (
              <div 
                key={chat.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px",
                  marginBottom: "4px",
                  background: currentChatId === chat.id ? "#1a1a1a" : "transparent",
                  border: currentChatId === chat.id ? "1px solid #333" : "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
                onClick={() => loadChat(chat)}
              >
                <span style={{ fontSize: "13px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {chat.title}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "2px 6px"
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Chat Messages */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          {chatMessages.length === 0 && (
            <div style={{ 
              textAlign: "center", 
              color: "var(--text-muted)", 
              padding: "40px 20px",
              fontSize: "14px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
              <p>Start a conversation with AI</p>
              <p style={{ fontSize: "12px" }}>Ask questions about your search results or anything else!</p>
            </div>
          )}
          
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: "85%",
                padding: "12px 16px",
                borderRadius: msg.role === 'user' ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === 'user' 
                  ? "#fff" 
                  : "#1a1a1a",
                color: msg.role === 'user' ? "#000" : "#fff",
                fontSize: "14px",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap"
              }}
            >
              {msg.content}
            </div>
          ))}
          
          {chatLoading && (
            <div style={{
              alignSelf: 'flex-start',
              padding: "12px 16px",
              borderRadius: "16px 16px 16px 4px",
              background: "#1a1a1a",
              fontSize: "14px",
              color: "#888"
            }}>
              <span className="typing-dots">Thinking...</span>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (followUp.trim() && !chatLoading) {
              sendMessage(followUp);
              setFollowUp("");
            }
          }}
          style={{ 
            padding: "16px", 
            borderTop: "1px solid #222",
            display: "flex",
            gap: "8px"
          }}
        >
          <input
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "12px 16px",
              fontSize: "14px",
              borderRadius: "8px",
              background: "#1a1a1a",
              border: "1px solid #333",
              color: "#fff",
              outline: "none"
            }}
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !followUp.trim()}
            style={{
              background: "#fff",
              border: "none",
              color: "#000",
              padding: "12px 20px",
              borderRadius: "8px",
              cursor: chatLoading || !followUp.trim() ? "not-allowed" : "pointer",
              opacity: chatLoading || !followUp.trim() ? 0.5 : 1,
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            {chatLoading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
