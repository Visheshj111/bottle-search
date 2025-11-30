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
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Main Content */}
      <div style={{ flex: 1, padding: "40px 20px", transition: "margin-right 0.3s ease", marginRight: isChatOpen ? "400px" : "0" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <button
              onClick={() => navigate("/")}
              className="glass-button"
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              ← Back to Home
            </button>
            
            {/* Chat Toggle Button */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="glass-button"
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: isChatOpen ? "var(--primary)" : "rgba(99, 102, 241, 0.2)"
              }}
            >
              💬 AI Chat {isChatOpen ? "✕" : ""}
            </button>
          </div>

          <div className="glass-panel animate-fade-in" style={{ padding: "24px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>🔍 Universal Search</h2>
            </div>

            <form onSubmit={onSearch} style={{ display: "flex", gap: "12px", position: "relative" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setShowSearchHistory(true)}
                  onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                  className="glass-input"
                  placeholder="Search anything... (Google, YouTube, Reddit, AI)"
                  style={{ 
                    padding: "16px 20px", 
                    fontSize: "16px",
                    borderRadius: "12px",
                    width: "100%"
                  }}
                />
                
                {/* Search History Dropdown */}
                {showSearchHistory && searchHistory.length > 0 && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "8px",
                    background: "rgba(20, 20, 35, 0.98)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                    zIndex: 100,
                    maxHeight: "300px",
                    overflowY: "auto"
                  }}>
                    <div style={{ 
                      padding: "12px 16px", 
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>
                        🕒 Recent Searches
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); clearSearchHistory(); }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: "11px",
                          padding: "4px 8px"
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                    {searchHistory.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "12px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          borderBottom: idx < searchHistory.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(99, 102, 241, 0.2)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setQ(item.query);
                          performSearch(item.query);
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px", color: "var(--text-main)" }}>{item.query}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {new Date(item.timestamp).toLocaleDateString()}
                          </div>
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
                            fontSize: "16px",
                            padding: "4px 8px",
                            opacity: 0.5
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                disabled={loading}
                type="submit"
                className="glass-button"
                style={{ 
                  padding: "0 32px",
                  borderRadius: "12px",
                  fontSize: "16px",
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>

          {error && (
            <div className="glass-panel animate-fade-in" style={{ 
              backgroundColor: "rgba(220, 38, 38, 0.2)", 
              borderColor: "rgba(220, 38, 38, 0.3)",
              color: "#fca5a5",
              padding: "16px",
              marginBottom: "20px",
            }}>
              {error}
            </div>
          )}

          {result && (
            <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              {/* Quick AI Actions */}
              <section className="glass-panel" style={{ marginBottom: "24px", padding: "16px", background: "rgba(99, 102, 241, 0.1)" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "14px", color: "var(--text-muted)", marginRight: "8px" }}>Quick AI:</span>
                    {[
                      { text: "📝 Summarize", query: "Summarize the top solutions" },
                      { text: "💬 Ask AI", query: result?.query || q },
                      { text: "🔍 Causes", query: "What are the most common causes?" },
                      { text: "📋 Steps", query: "Give me step-by-step instructions" }
                    ].map((btn) => (
                      <button
                        key={btn.text}
                        onClick={() => {
                          setIsChatOpen(true);
                          sendMessage(btn.query);
                        }}
                        disabled={chatLoading}
                        className="glass-button"
                        style={{
                          padding: "6px 12px",
                          fontSize: "13px",
                          borderRadius: "6px",
                          background: "rgba(255,255,255,0.1)",
                          border: "1px solid rgba(255,255,255,0.1)"
                        }}
                      >
                        {btn.text}
                      </button>
                    ))}
                  </div>
                </section>

              {/* Section Navigation Tabs */}
              <div style={{ 
                display: "flex", 
                gap: "8px", 
                marginBottom: "20px",
                flexWrap: "wrap",
                position: "sticky",
                top: "0",
                background: "rgba(10, 10, 20, 0.95)",
                padding: "12px 0",
                zIndex: 50,
                backdropFilter: "blur(10px)"
              }}>
                {[
                  { id: "videos", icon: "📺", label: "Videos", count: result.videos?.length },
                  { id: "images", icon: "🖼️", label: "Images", count: result.images?.length },
                  { id: "google", icon: "🌐", label: "Web Results", count: result.google?.length },
                  { id: "reddit", icon: "💬", label: "Reddit", count: result.reddit?.length },
                  { id: "ai", icon: "🤖", label: "Ask AI", action: () => setIsChatOpen(true) }
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
                    className="glass-button"
                    style={{
                      padding: "8px 16px",
                      fontSize: "14px",
                      borderRadius: "8px",
                      background: "rgba(99, 102, 241, 0.2)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                  >
                    {tab.icon} {tab.label}
                    {tab.count !== undefined && (
                      <span style={{ 
                        background: "rgba(255,255,255,0.2)", 
                        padding: "2px 6px", 
                        borderRadius: "10px", 
                        fontSize: "11px" 
                      }}>
                        {tab.count || 0}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <div style={{ display: "grid", gap: "24px" }}>
                {/* Videos Section */}
                <section id="videos">
                  <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    📺 Videos
                  </h3>
                  <div style={{ display: "grid", gap: "16px" }}>
                    {result.videos?.map((v) => (
                      <div key={v.videoId} className="glass-panel hover-scale" style={{ padding: "16px", display: "flex", gap: "16px" }}>
                        <a href={v.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                          <img
                            src={v.thumbnails?.medium?.url || v.thumbnails?.default?.url}
                            style={{ width: "160px", borderRadius: "8px", objectFit: "cover" }}
                            alt=""
                          />
                        </a>
                        <div style={{ flex: 1 }}>
                          <a href={v.url} target="_blank" rel="noreferrer" style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-main)", textDecoration: "none", display: "block", marginBottom: "8px" }}>
                            {v.title}
                          </a>
                          <div style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "8px" }}>
                            {v.channelTitle} • {new Date(v.publishedAt).toLocaleDateString()}
                          </div>
                          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                            {v.description?.slice(0, 150)}...
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Google Results */}
                {result.google && result.google.length > 0 && (
                  <section id="google">
                    <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                      🌐 Web Results
                    </h3>
                    <div style={{ display: "grid", gap: "16px" }}>
                      {result.google?.map((g, idx) => (
                        <div key={idx} className="glass-panel hover-scale" style={{ padding: "20px" }}>
                          <a href={g.link} target="_blank" rel="noreferrer" style={{ fontSize: "18px", fontWeight: "600", color: "#60a5fa", textDecoration: "none", display: "block", marginBottom: "4px" }}>
                            {g.title}
                          </a>
                          <div style={{ color: "#4ade80", fontSize: "13px", marginBottom: "8px" }}>
                            {g.displayLink}
                          </div>
                          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.5 }}>
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
                    <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                      🖼️ Images
                    </h3>
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
                      gap: "12px" 
                    }}>
                      {result.images?.map((img, idx) => (
                        <a 
                          key={idx} 
                          href={img.link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="glass-panel hover-scale"
                          style={{ 
                            overflow: "hidden", 
                            borderRadius: "12px",
                            display: "block",
                            textDecoration: "none"
                          }}
                        >
                          <img
                            src={img.thumbnail}
                            alt={img.title}
                            style={{ 
                              width: "100%", 
                              height: "140px", 
                              objectFit: "cover",
                              display: "block"
                            }}
                            loading="lazy"
                          />
                          <div style={{ padding: "10px" }}>
                            <p style={{ 
                              margin: 0, 
                              fontSize: "12px", 
                              color: "var(--text-main)",
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
                  <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    💬 Reddit
                  </h3>
                  <div style={{ display: "grid", gap: "16px" }}>
                    {result.reddit?.map((r) => (
                      <div key={r.id} className="glass-panel hover-scale" style={{ padding: "20px" }}>
                        <a href={r.permalink} target="_blank" rel="noreferrer" style={{ fontSize: "16px", fontWeight: "600", color: "#ff4500", textDecoration: "none", display: "block", marginBottom: "8px" }}>
                          r/{r.subreddit} — {r.title}
                        </a>
                        <div style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "12px" }}>
                          {r.score} points • {r.num_comments} comments
                        </div>
                        <p style={{ margin: 0, fontSize: "14px", color: "var(--text-main)", lineHeight: 1.5 }}>
                          {r.selftext ? (r.selftext.length > 300 ? r.selftext.slice(0, 300) + "..." : r.selftext) : "No preview available"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
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
          background: "rgba(15, 15, 25, 0.98)",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
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
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h3 style={{ margin: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
            🤖 AI Assistant
          </h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={startNewChat}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "var(--text-main)",
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
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            maxHeight: "150px",
            overflowY: "auto"
          }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase" }}>
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
                  background: currentChatId === chat.id ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.05)",
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
                  ? "linear-gradient(135deg, #6366f1, #8b5cf6)" 
                  : "rgba(255,255,255,0.1)",
                fontSize: "14px",
                lineHeight: 1.5,
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
              background: "rgba(255,255,255,0.1)",
              fontSize: "14px"
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
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            gap: "8px"
          }}
        >
          <input
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            className="glass-input"
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "12px 16px",
              fontSize: "14px",
              borderRadius: "24px",
              background: "rgba(255,255,255,0.05)"
            }}
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !followUp.trim()}
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              color: "white",
              padding: "12px 20px",
              borderRadius: "24px",
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
