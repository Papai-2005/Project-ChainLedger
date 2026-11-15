import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "./layouts/dasboardlayout.jsx";
import Dashboard from "./pages/dashboard.jsx";
import Login from "./pages/login.jsx";
import Register from "./pages/register.jsx";
import ProtectedRoute from "./components/protectedroutes.jsx";
import Wallet from "./pages/wallet.jsx";
import Transactions from "./pages/transactions.jsx";
import Analytics from "./pages/analytics.jsx";

function ComingSoon({ title }) {
  return (
    <div className="page-heading">
      <h1>{title}</h1>
      <p>This section is under development.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<ComingSoon title="Settings" />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

