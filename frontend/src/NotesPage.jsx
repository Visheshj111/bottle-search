import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api';

export default function NotesPage() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newNote, setNewNote] = useState({ title: "", content: "", tags: "" });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    try {
      const res = await fetch(`${API_URL}/notes`);
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
        headers: { "Content-Type": "application/json" },
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
      await fetch(`${API_URL}/notes/${id}`, { method: "DELETE" });
      setNotes(notes.filter(n => n._id !== id));
    } catch (err) {
      alert("Failed to delete");
    }
  }

  return (
    <div style={{ padding: "40px 20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
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
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="glass-button"
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              backgroundColor: isCreating ? "#ef4444" : "var(--primary)"
            }}
          >
            {isCreating ? "Cancel" : "+ New Note"}
          </button>
        </div>

        {error && (
          <div className="glass-panel" style={{ padding: "20px", color: "#fca5a5", marginBottom: "24px", textAlign: "center" }}>
            ⚠️ {error}
          </div>
        )}

        {isCreating && (
          <div className="glass-panel animate-fade-in" style={{ padding: "24px", marginBottom: "32px" }}>
            <form onSubmit={handleCreate}>
              <input
                className="glass-input"
                placeholder="Note Title"
                value={newNote.title}
                onChange={e => setNewNote({...newNote, title: e.target.value})}
                style={{ width: "100%", padding: "12px", marginBottom: "16px", fontSize: "18px", borderRadius: "8px" }}
                autoFocus
              />
              <textarea
                className="glass-input"
                placeholder="Write something..."
                value={newNote.content}
                onChange={e => setNewNote({...newNote, content: e.target.value})}
                style={{ width: "100%", padding: "12px", marginBottom: "16px", minHeight: "150px", borderRadius: "8px", fontFamily: "inherit" }}
              />
              <input
                className="glass-input"
                placeholder="Tags (comma separated)"
                value={newNote.tags}
                onChange={e => setNewNote({...newNote, tags: e.target.value})}
                style={{ width: "100%", padding: "12px", marginBottom: "24px", borderRadius: "8px" }}
              />
              <button type="submit" className="glass-button" style={{ padding: "12px 24px", borderRadius: "8px", width: "100%" }}>
                Save Note
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading notes...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
            {notes.map(note => (
              <div key={note._id} className="glass-panel hover-scale" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "20px" }}>{note.title}</h3>
                  <button 
                    onClick={() => handleDelete(note._id)}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "18px", padding: "4px" }}
                  >
                    ×
                  </button>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "14px", whiteSpace: "pre-wrap", flex: 1, marginBottom: "16px" }}>
                  {note.content}
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {note.tags?.map((tag, i) => (
                    <span key={i} style={{ fontSize: "12px", background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: "4px" }}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "16px", textAlign: "right" }}>
                  {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && notes.length === 0 && !error && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "40px" }}>
            No notes yet. Create one to get started! 📝
          </div>
        )}
      </div>
    </div>
  );
}
