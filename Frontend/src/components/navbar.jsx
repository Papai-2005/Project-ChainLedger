import React from "react";
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
} from "lucide-react";

import { useAuth } from "../context/authcontext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();

  const userInitial = user?.displayName?.charAt(0).toUpperCase() || "G";

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="breadcrumb">
          Workspace
          <span>/</span>
          <strong>Overview</strong>
        </div>
      </div>

      <div className="navbar-right">
        <div className="search-box">
          <Search size={17} />

          <input
            type="text"
            placeholder="Search anything..."
          />

          <kbd>⌘ K</kbd>
        </div>

        <button className="notification-button">
          <Bell size={19} />
          <span className="notification-dot"></span>
        </button>

        <div className="profile">
          <div className="profile-avatar">
            {userInitial}
          </div>

          <div className="profile-info">
            <strong>{user?.displayName || "Guest User"}</strong>
            <span>{user?.email || "Free Account"}</span>
          </div>

          <ChevronDown size={16} />

          <button
            type="button"
            onClick={logout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
