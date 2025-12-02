import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api';

export default function TasksPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, [token]);

  function getHeaders(withContentType = false) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (withContentType) headers['Content-Type'] = 'application/json';
    return headers;
  }

  async function fetchTasks() {
    try {
      const res = await fetch(`${API_URL}/tasks`, { headers: getHeaders() });
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
        headers: getHeaders(true),
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
        headers: getHeaders(true),
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
      await fetch(`${API_URL}/tasks/${id}`, { method: "DELETE", headers: getHeaders() });
      setTasks(tasks.filter(t => t._id !== id));
    } catch (err) {
      alert("Failed to delete task");
    }
  }

  const pendingCount = tasks.filter(t => !t.completed).length;

  const inputStyle = {
    background: "#111",
    border: "1px solid #333",
    color: "#fff",
    borderRadius: "8px",
    outline: "none"
  };

  const buttonStyle = {
    background: "#fff",
    color: "#000",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: "40px 20px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
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
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>✅ Tasks</h1>
          <div style={{ fontSize: "14px", color: "#666" }}>
            {pendingCount} pending
          </div>
        </div>

        <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "32px" }}>
          {error && (
            <div style={{ 
              background: "#1a0a0a", 
              border: "1px solid #3a1a1a", 
              borderRadius: "8px", 
              padding: "16px", 
              color: "#ff6b6b", 
              marginBottom: "24px" 
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
            <input
              placeholder="Add a new task..."
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              style={{ ...inputStyle, flex: 1, padding: "14px 16px", fontSize: "15px" }}
              autoFocus
            />
            <button 
              type="submit" 
              style={{ ...buttonStyle, padding: "14px 28px", fontSize: "14px" }}
            >
              Add
            </button>
          </form>

          {loading ? (
            <div style={{ textAlign: "center", color: "#666", padding: "40px" }}>Loading tasks...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tasks.map(task => (
                <div 
                  key={task._id} 
                  style={{ 
                    padding: "16px", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "16px",
                    background: task.completed ? "#0a0a0a" : "#1a1a1a",
                    border: "1px solid #222",
                    borderRadius: "8px",
                    transition: "all 0.2s ease"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task)}
                    style={{ 
                      width: "20px", 
                      height: "20px", 
                      cursor: "pointer",
                      accentColor: "#fff"
                    }}
                  />
                  <span style={{ 
                    flex: 1, 
                    fontSize: "15px", 
                    textDecoration: task.completed ? "line-through" : "none",
                    color: task.completed ? "#555" : "#fff"
                  }}>
                    {task.text}
                  </span>
                  <button
                    onClick={() => handleDelete(task._id)}
                    style={{ 
                      background: "none", 
                      border: "none", 
                      color: "#555", 
                      cursor: "pointer",
                      fontSize: "18px",
                      padding: "4px 8px"
                    }}
                    title="Delete task"
                  >
                    ×
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>✓</div>
                  <p>No tasks yet. Add one above!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}