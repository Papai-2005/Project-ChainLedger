import { useEffect, useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { getAnalyticsOverview, getMonthlyAnalytics, getWalletAnalytics } from "../api/analytics.js";
import { getTransactions } from "../api/transactions.js";

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const today = new Date();

      const [overviewData, monthlyData, walletData, transactionData] =
        await Promise.all([
          getAnalyticsOverview(),
          getMonthlyAnalytics(today.getFullYear(), today.getMonth() + 1),
          getWalletAnalytics(),
          getTransactions({ page: 1, limit: 5 }),
        ]);

      setOverview(overviewData.overview);
      setMonthly(monthlyData);
      setWallets(walletData.wallets || []);
      setTransactions(transactionData.transactions || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const chartData = (monthly?.dailyBreakdown || []).map((item) => ({
    day: item.date.slice(8),
    income: Number(item.income),
    expenses: Number(item.expenses),
  }));

  const getTransactionWallet = (tx) => {
    if (tx.type === "INCOME") {
      return tx.destinationWallet?.label || "Wallet";
    }

    if (tx.type === "EXPENSE") {
      return tx.sourceWallet?.label || "Wallet";
    }

    return `${tx.sourceWallet?.label || "Wallet"} → ${
      tx.destinationWallet?.label || "Wallet"
    }`;
  };

  const getTransactionAmount = (tx) => {
    const amount = formatINR(tx.amount);

    if (tx.type === "INCOME") return `+${amount}`;
    if (tx.type === "EXPENSE") return `-${amount}`;

    return amount;
  };

  return (
    <div className="dashboard">

      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's your ChainLedger activity overview.</p>
        </div>

        <div className="heading-actions">
          <button
            className="secondary-button"
            onClick={fetchDashboard}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <Link to="/transactions" className="primary-button">
            <ArrowUpRight size={17} />
            Transactions
          </Link>
        </div>
      </div>

      {error && (
        <div className="analytics-error">
          {error}
        </div>
      )}

      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon">
              <Wallet size={20} />
            </div>
          </div>
          <p className="stat-title">Net Balance</p>
          <h3 className="stat-value">
            {loading ? "Loading..." : formatINR(overview?.netBalance)}
          </h3>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <p className="stat-title">Total Income</p>
          <h3 className="stat-value">
            {loading ? "Loading..." : formatINR(overview?.totalIncome)}
          </h3>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon">
              <ArrowDownLeft size={20} />
            </div>
          </div>
          <p className="stat-title">Total Expenses</p>
          <h3 className="stat-value">
            {loading ? "Loading..." : formatINR(overview?.totalExpenses)}
          </h3>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon">
              <Activity size={20} />
            </div>
          </div>
          <p className="stat-title">Transactions</p>
          <h3 className="stat-value">
            {loading ? "Loading..." : overview?.totalTransactions ?? 0}
          </h3>
        </div>

      </div>

      <div className="dashboard-grid">

        <section className="content-card chart-section">

          <div className="section-heading">
            <div>
              <h3>Monthly Transaction Activity</h3>
              <p>Daily income and expenses for this month (INR)</p>
            </div>
          </div>

          <div className="chart-container">
            {loading ? (
              <p className="analytics-empty">Loading chart...</p>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>

                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} />

                  <XAxis dataKey="day" />

                  <YAxis
                    tickFormatter={(value) => `₹${value}`}
                    width={75}
                  />

                  <Tooltip formatter={(value) => formatINR(value)} />
                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#16a34a"
                    fill="url(#incomeGradient)"
                  />

                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#ef4444"
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="analytics-empty">
                No completed INR transactions this month.
              </p>
            )}
          </div>

        </section>

        <section className="content-card network-section">

          <div className="section-heading">
            <div>
              <h3>Wallet Overview</h3>
              <p>Your connected ledger wallets</p>
            </div>
          </div>

          <div className="network-status-box">
            <div className="network-status-icon">
              <Wallet size={22} />
            </div>

            <div>
              <strong>{wallets.length} Wallets</strong>
              <p>Your ChainLedger accounts</p>
            </div>
          </div>

          <div className="network-details">
            <div>
              <span>Total Wallets</span>
              <strong>{wallets.length}</strong>
            </div>

            <div>
              <span>Total Income</span>
              <strong>
                {formatINR(wallets.reduce((sum, wallet) => sum + Number(wallet.income || 0), 0))}
              </strong>
            </div>

            <div>
              <span>Total Expenses</span>
              <strong>
                {formatINR(wallets.reduce((sum, wallet) => sum + Number(wallet.expenses || 0), 0))}
              </strong>
            </div>
          </div>

          <Link to="/wallet" className="text-button">
            Manage wallets <ArrowRight size={15} />
          </Link>

        </section>

      </div>

      <section className="content-card transactions-section">

        <div className="section-heading">
          <div>
            <h3>Recent Transactions</h3>
            <p>Your latest recorded ledger activity</p>
          </div>

          <Link to="/transactions" className="text-button">
            View all <ArrowRight size={16} />
          </Link>
        </div>

        <div className="table-wrapper">

          <table className="transaction-table">

            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Type</th>
                <th>Wallet</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (
                <tr>
                  <td colSpan="6">Loading transactions...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6">No transactions recorded yet.</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>

                    <td className="transaction-id">
                      {tx.id.slice(-10)}
                    </td>

                    <td>{tx.type}</td>

                    <td className="address">
                      {getTransactionWallet(tx)}
                    </td>

                    <td className={
                      tx.type === "INCOME"
                        ? "amount received"
                        : tx.type === "EXPENSE"
                        ? "amount sent"
                        : "amount"
                    }>
                      {getTransactionAmount(tx)}
                    </td>

                    <td>
                      <span className={`status-badge ${
                        tx.status === "COMPLETED"
                          ? "confirmed"
                          : tx.status === "PENDING"
                          ? "pending"
                          : "failed"
                      }`}>
                        {tx.status}
                      </span>
                    </td>

                    <td>{formatDate(tx.occurredAt)}</td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  );
}
