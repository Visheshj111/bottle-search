import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api';

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byCategory: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newExpense, setNewExpense] = useState({ title: "", amount: "", category: "Food", date: new Date().toISOString().split('T')[0] });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [expRes, sumRes] = await Promise.all([
        fetch(`${API_URL}/expenses`),
        fetch(`${API_URL}/expenses/summary`)
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
        headers: { "Content-Type": "application/json" },
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
      await fetch(`${API_URL}/expenses/${id}`, { method: "DELETE" });
      await fetchData();
    } catch (err) {
      alert("Failed to delete");
    }
  }

  const categories = ["Food", "Transport", "Housing", "Utilities", "Entertainment", "Health", "Other"];

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
            {isCreating ? "Cancel" : "+ Add Expense"}
          </button>
        </div>

        {error && (
          <div className="glass-panel" style={{ padding: "20px", color: "#fca5a5", marginBottom: "24px", textAlign: "center" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px", marginBottom: "32px" }}>
          <div className="glass-panel" style={{ padding: "24px", textAlign: "center", background: "rgba(16, 185, 129, 0.1)" }}>
            <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>Total Spent</div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#34d399" }}>${summary.total.toFixed(2)}</div>
          </div>
          <div className="glass-panel" style={{ padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>Transactions</div>
            <div style={{ fontSize: "32px", fontWeight: "bold" }}>{expenses.length}</div>
          </div>
        </div>

        {isCreating && (
          <div className="glass-panel animate-fade-in" style={{ padding: "24px", marginBottom: "32px" }}>
            <form onSubmit={handleCreate} style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <input
                className="glass-input"
                placeholder="Description"
                value={newExpense.title}
                onChange={e => setNewExpense({...newExpense, title: e.target.value})}
                style={{ padding: "12px", borderRadius: "8px" }}
                autoFocus
              />
              <input
                type="number"
                className="glass-input"
                placeholder="Amount"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                style={{ padding: "12px", borderRadius: "8px" }}
              />
              <select
                className="glass-input"
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                style={{ padding: "12px", borderRadius: "8px" }}
              >
                {categories.map(c => <option key={c} value={c} style={{color: "black"}}>{c}</option>)}
              </select>
              <input
                type="date"
                className="glass-input"
                value={newExpense.date}
                onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                style={{ padding: "12px", borderRadius: "8px" }}
              />
              <button type="submit" className="glass-button" style={{ padding: "12px", borderRadius: "8px", gridColumn: "1 / -1" }}>
                Save Expense
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading expenses...</div>
        ) : (
          <div className="glass-panel" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)" }}>Date</th>
                  <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)" }}>Description</th>
                  <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)" }}>Category</th>
                  <th style={{ padding: "16px", textAlign: "right", color: "var(--text-muted)" }}>Amount</th>
                  <th style={{ padding: "16px", width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => (
                  <tr key={exp._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "16px" }}>{new Date(exp.date).toLocaleDateString()}</td>
                    <td style={{ padding: "16px", fontWeight: "500" }}>{exp.title}</td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ fontSize: "12px", background: "rgba(255,255,255,0.1)", padding: "4px 8px", borderRadius: "4px" }}>
                        {exp.category}
                      </span>
                    </td>
                    <td style={{ padding: "16px", textAlign: "right", color: "#fca5a5" }}>-${exp.amount.toFixed(2)}</td>
                    <td style={{ padding: "16px" }}>
                      <button 
                        onClick={() => handleDelete(exp._id)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                No expenses recorded yet. 💰
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
