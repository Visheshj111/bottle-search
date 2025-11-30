import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api';

export default function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const res = await fetch(`${API_URL}/tasks`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
      setError("Could not load tasks. Is the backend-api running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newTask, completed: false }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      
      await fetchTasks();
      setNewTask("");
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleToggle(task) {
    try {
      const res = await fetch(`${API_URL}/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      
      // Optimistic update
      setTasks(tasks.map(t => t._id === task._id ? { ...t, completed: !t.completed } : t));
    } catch (err) {
      alert("Failed to update task");
      fetchTasks(); // Revert on error
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE" });
      setTasks(tasks.filter(t => t._id !== id));
    } catch (err) {
      alert("Failed to delete task");
    }
  }

  const pendingCount = tasks.filter(t => !t.completed).length;

  return (
    <div style={{ padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button
          onClick={() => navigate("/")}
          className="glass-button"
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "24px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          ← Back to Home
        </button>

        <div className="glass-panel animate-fade-in" style={{ padding: "40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <h1 style={{ margin: 0, fontSize: "32px" }}>✅ Tasks</h1>
            <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              {pendingCount} pending
            </div>
          </div>

          {error && (
            <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", borderRadius: "8px", marginBottom: "24px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
            <input
              className="glass-input"
              placeholder="Add a new task..."
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              style={{ flex: 1, padding: "16px", borderRadius: "12px" }}
              autoFocus
            />
            <button 
              type="submit" 
              className="glass-button"
              style={{ padding: "0 32px", borderRadius: "12px", fontWeight: "bold" }}
            >
              Add
            </button>
          </form>

          {loading ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading tasks...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {tasks.map(task => (
                <div 
                  key={task._id} 
                  className="glass-panel"
                  style={{ 
                    padding: "16px", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "16px",
                    background: task.completed ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task)}
                    style={{ 
                      width: "24px", 
                      height: "24px", 
                      cursor: "pointer",
                      accentColor: "var(--primary)"
                    }}
                  />
                  <span style={{ 
                    flex: 1, 
                    fontSize: "18px", 
                    textDecoration: task.completed ? "line-through" : "none",
                    color: task.completed ? "var(--text-muted)" : "var(--text-main)"
                  }}>
                    {task.text}
                  </span>
                  <button
                    onClick={() => handleDelete(task._id)}
                    style={{ 
                      background: "none", 
                      border: "none", 
                      color: "var(--text-muted)", 
                      cursor: "pointer",
                      fontSize: "20px",
                      padding: "8px"
                    }}
                    title="Delete task"
                  >
                    ×
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  No tasks yet. Add one above!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}