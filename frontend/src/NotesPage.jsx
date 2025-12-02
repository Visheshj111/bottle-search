import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api';

export default function NotesPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newNote, setNewNote] = useState({ title: "", content: "", tags: "" });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [token]);

  function getHeaders(withContentType = false) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (withContentType) headers['Content-Type'] = 'application/json';
    return headers;
  }

  async function fetchNotes() {
    try {
      const res = await fetch(`${API_URL}/notes`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to connect to Notes API");
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error(err);
      setError("Could not load notes. Is the backend-api running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newNote.title.trim()) return;

    try {
      const res = await fetch(`${API_URL}/notes`, {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({
          ...newNote,
          tags: newNote.tags.split(",").map(t => t.trim()).filter(Boolean)
        }),
      });
      if (!res.ok) throw new Error("Failed to create note");
      
      await fetchNotes();
      setNewNote({ title: "", content: "", tags: "" });
      setIsCreating(false);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this note?")) return;
    try {
      await fetch(`${API_URL}/notes/${id}`, { method: "DELETE", headers: getHeaders() });
      setNotes(notes.filter(n => n._id !== id));
    } catch (err) {
      alert("Failed to delete");
    }
  }

  const inputStyle = {
    background: "#111",
    border: "1px solid #333",
    color: "#fff",
    borderRadius: "8px",
    outline: "none",
    fontFamily: "inherit"
  };

  const buttonStyle = {
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "opacity 0.2s"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              ...buttonStyle,
              background: "#111",
              color: "#fff",
              border: "1px solid #333",
              padding: "10px 20px",
              fontSize: "14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>📝 Notes</h1>
          <button
            onClick={() => setIsCreating(!isCreating)}
            style={{
              ...buttonStyle,
              padding: "10px 20px",
              fontSize: "14px",
              background: isCreating ? "#ef4444" : "#fff",
              color: isCreating ? "#fff" : "#000"
            }}
          >
            {isCreating ? "Cancel" : "+ New Note"}
          </button>
        </div>

        {error && (
          <div style={{ 
            background: "#1a0a0a", 
            border: "1px solid #3a1a1a", 
            borderRadius: "8px", 
            padding: "16px", 
            color: "#ff6b6b", 
            marginBottom: "24px", 
            textAlign: "center" 
          }}>
            ⚠️ {error}
          </div>
        )}

        {isCreating && (
          <div style={{ 
            background: "#111", 
            border: "1px solid #222", 
            borderRadius: "12px", 
            padding: "24px", 
            marginBottom: "32px" 
          }}>
            <form onSubmit={handleCreate}>
              <input
                placeholder="Note Title"
                value={newNote.title}
                onChange={e => setNewNote({...newNote, title: e.target.value})}
                style={{ ...inputStyle, width: "100%", padding: "14px", marginBottom: "16px", fontSize: "16px" }}
                autoFocus
              />
              <textarea
                placeholder="Write something..."
                value={newNote.content}
                onChange={e => setNewNote({...newNote, content: e.target.value})}
                style={{ ...inputStyle, width: "100%", padding: "14px", marginBottom: "16px", minHeight: "150px", resize: "vertical" }}
              />
              <input
                placeholder="Tags (comma separated)"
                value={newNote.tags}
                onChange={e => setNewNote({...newNote, tags: e.target.value})}
                style={{ ...inputStyle, width: "100%", padding: "14px", marginBottom: "24px" }}
              />
              <button type="submit" style={{ ...buttonStyle, padding: "14px 24px", width: "100%", fontSize: "14px" }}>
                Save Note
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "#666", padding: "60px" }}>Loading notes...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {notes.map(note => (
              <div 
                key={note._id} 
                style={{ 
                  background: "#111", 
                  border: "1px solid #222", 
                  borderRadius: "12px", 
                  padding: "20px", 
                  display: "flex", 
                  flexDirection: "column",
                  transition: "border-color 0.2s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>{note.title}</h3>
                  <button 
                    onClick={() => handleDelete(note._id)}
                    style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "20px", padding: "0" }}
                  >
                    ×
                  </button>
                </div>
                <p style={{ color: "#888", fontSize: "14px", whiteSpace: "pre-wrap", flex: 1, marginBottom: "16px", lineHeight: 1.6 }}>
                  {note.content}
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {note.tags?.map((tag, i) => (
                    <span key={i} style={{ fontSize: "12px", background: "#1a1a1a", border: "1px solid #333", padding: "4px 10px", borderRadius: "4px", color: "#888" }}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: "12px", color: "#555", textAlign: "right" }}>
                  {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && notes.length === 0 && !error && (
          <div style={{ textAlign: "center", color: "#666", padding: "60px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
            <p>No notes yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
