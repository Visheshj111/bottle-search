import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import HomePage from "./HomePage";
import SearchPage from "./SearchPage";
import NotesPage from "./NotesPage";
import ExpensesPage from "./ExpensesPage";
import TasksPage from "./TasksPage";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import VerifyEmailPage from "./VerifyEmailPage";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
