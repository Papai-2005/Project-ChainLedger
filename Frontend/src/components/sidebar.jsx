import { NavLink } from "react-router-dom";
import React from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  Blocks,
  CircleHelp,
  ShieldCheck
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard
  },
  {
    title: "Transactions",
    path: "/transactions",
    icon: ArrowLeftRight
  },
  {
    title: "Wallet",
    path: "/wallet",
    icon: Wallet
  },
  {
    title: "Analytics",
    path: "/analytics",
    icon: ChartNoAxesCombined
  }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        <div className="logo-icon">
          <Blocks size={22} />
        </div>

        <div>
          <h2>ChainLedger</h2>
          <span>WEB3 FINANCE</span>
        </div>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "sidebar-link active"
                    : "sidebar-link"
                }
              >
                <Icon size={19} />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-label">PREFERENCES</p>

        <nav className="sidebar-nav">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive
                ? "sidebar-link active"
                : "sidebar-link"
            }
          >
            <Settings size={19} />
            <span>Settings</span>
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-bottom">

        <div className="network-card">
          <div className="network-indicator">
            <span className="status-dot"></span>
            Sepolia Testnet
          </div>

          <p>Ethereum Network</p>
        </div>

        <div className="sidebar-footer">
          <CircleHelp size={17} />
          <span>Help Center</span>
        </div>

        <div className="sidebar-footer">
          <ShieldCheck size={17} />
          <span>Security</span>
        </div>

        <p className="sidebar-version">
          ChainLedger v1.0.0
        </p>

      </div>
    </aside>
  );
}