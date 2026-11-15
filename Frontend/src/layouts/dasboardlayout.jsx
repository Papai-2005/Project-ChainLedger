import { Outlet } from "react-router-dom";
import React from "react";
import Sidebar from "../components/sidebar";
import Navbar from "../components/navbar";

export default function DashboardLayout() {
  return (
    <div className="app-layout">

      <Sidebar />

      <main className="main-content">

        <Navbar />

        <div className="page-content">
          <Outlet />
        </div>

      </main>

    </div>
  );
}