import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api';

export default function ExpensesPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byCategory: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newExpense, setNewExpense] = useState({ title: "", amount: "", category: "Food", date: new Date().toISOString().split('T')[0] });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  function getHeaders(withContentType = false) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (withContentType) headers['Content-Type'] = 'application/json';
    return headers;
  }

  async function fetchData() {
    try {
      const [expRes, sumRes] = await Promise.all([
        fetch(`${API_URL}/expenses`, { headers: getHeaders() }),
        fetch(`${API_URL}/expenses-summary`, { headers: getHeaders() })
      ]);

      if (!expRes.ok || !sumRes.ok) throw new Error("Failed to connect to API");

      const expData = await expRes.json();
      const sumData = await sumRes.json();

      setExpenses(expData);
      setSummary(sumData);
    } catch (err) {
      console.error(err);
      setError("Could not load expenses. Is the backend-api running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;

    try {
      const res = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify({
          ...newExpense,
          amount: parseFloat(newExpense.amount)
        }),
      });
      if (!res.ok) throw new Error("Failed to create expense");
      
      await fetchData();
      setNewExpense({ title: "", amount: "", category: "Food", date: new Date().toISOString().split('T')[0] });
      setIsCreating(false);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await fetch(`${API_URL}/expenses/${id}`, { method: "DELETE", headers: getHeaders() });
      await fetchData();
    } catch (err) {
      alert("Failed to delete");
    }
  }

  const categories = ["Food", "Transport", "Housing", "Utilities", "Entertainment", "Health", "Other"];

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
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
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
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600" }}>💰 Expenses</h1>
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
            {isCreating ? "Cancel" : "+ Add Expense"}
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

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Spent</div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#fff" }}>${summary.total.toFixed(2)}</div>
          </div>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Transactions</div>
            <div style={{ fontSize: "32px", fontWeight: "700" }}>{expenses.length}</div>
          </div>
        </div>

        {isCreating && (
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
            <form onSubmit={handleCreate} style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <input
                placeholder="Description"
                value={newExpense.title}
                onChange={e => setNewExpense({...newExpense, title: e.target.value})}
                style={{ ...inputStyle, padding: "14px" }}
                autoFocus
              />
              <input
                type="number"
                placeholder="Amount"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                style={{ ...inputStyle, padding: "14px" }}
              />
              <select
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                style={{ ...inputStyle, padding: "14px" }}
              >
                {categories.map(c => <option key={c} value={c} style={{background: "#111", color: "#fff"}}>{c}</option>)}
              </select>
              <input
                type="date"
                value={newExpense.date}
                onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                style={{ ...inputStyle, padding: "14px" }}
              />
              <button type="submit" style={{ ...buttonStyle, padding: "14px", gridColumn: "1 / -1" }}>
                Save Expense
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "#666", padding: "60px" }}>Loading expenses...</div>
        ) : (
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  <th style={{ padding: "16px", textAlign: "left", color: "#666", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</th>
                  <th style={{ padding: "16px", textAlign: "left", color: "#666", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</th>
                  <th style={{ padding: "16px", textAlign: "left", color: "#666", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Category</th>
                  <th style={{ padding: "16px", textAlign: "right", color: "#666", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Amount</th>
                  <th style={{ padding: "16px", width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp._id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ padding: "16px", color: "#888", fontSize: "14px" }}>{new Date(exp.date).toLocaleDateString()}</td>
                    <td style={{ padding: "16px", fontWeight: "500", fontSize: "14px" }}>{exp.title}</td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ fontSize: "12px", background: "#1a1a1a", border: "1px solid #333", padding: "4px 10px", borderRadius: "4px", color: "#888" }}>
                        {exp.category}
                      </span>
                    </td>
                    <td style={{ padding: "16px", textAlign: "right", color: "#ff6b6b", fontWeight: "500", fontSize: "14px" }}>-${exp.amount.toFixed(2)}</td>
                    <td style={{ padding: "16px" }}>
                      <button 
                        onClick={() => handleDelete(exp._id)}
                        style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "16px" }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div style={{ padding: "60px", textAlign: "center", color: "#666" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>💰</div>
                <p>No expenses recorded yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
