
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/authcontext.jsx";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Loading ChainLedger...</div>;
  }

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/login" replace />;
}
