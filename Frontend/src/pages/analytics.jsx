import { useEffect, useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import {
  getAnalyticsOverview,
  getMonthlyAnalytics,
  getWalletAnalytics,
} from "../api/analytics.js";

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function Analytics() {
  const today = new Date();

  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [wallets, setWallets] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchOverviewAndWallets = async () => {
      try {
        const [overviewData, walletData] = await Promise.all([
          getAnalyticsOverview(),
          getWalletAnalytics(),
        ]);

        if (!active) return;

        setOverview(overviewData.overview);
        setWallets(walletData.wallets || []);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load analytics data."
          );
        }
      }
    };

    fetchOverviewAndWallets();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchMonthly = async () => {
      setLoading(true);
      setError("");

      try {
        const [year, month] = selectedMonth.split("-").map(Number);
        const data = await getMonthlyAnalytics(year, month);

        if (active) {
          setMonthly(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load monthly analytics."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMonthly();

    return () => {
      active = false;
    };
  }, [selectedMonth]);

  const refreshAnalytics = async () => {
    setLoading(true);
    setError("");

    try {
      const [overviewData, walletData] = await Promise.all([
        getAnalyticsOverview(),
        getWalletAnalytics(),
      ]);

      const [year, month] = selectedMonth.split("-").map(Number);
      const monthlyData = await getMonthlyAnalytics(year, month);

      setOverview(overviewData.overview);
      setWallets(walletData.wallets || []);
      setMonthly(monthlyData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to refresh analytics."
      );
    } finally {
      setLoading(false);
    }
  };

  const summary = monthly?.summary;

  return (
    <div className="analytics-page">
      <div className="page-heading analytics-heading">
        <div>
          <h1>Analytics</h1>
          <p>Track your financial activity and wallet performance.</p>
        </div>

        <button
          className="secondary-button"
          onClick={refreshAnalytics}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="analytics-error">{error}</div>}

      <div className="analytics-month-filter">
        <label htmlFor="analytics-month">Select month</label>
        <input
          id="analytics-month"
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </div>

      <div className="analytics-section">
        <h2>Overall Overview</h2>

        <div className="analytics-stats-grid">
          <div className="analytics-stat-card">
            <div className="analytics-stat-icon income-icon">
              <TrendingUp size={20} />
            </div>
            <p>Total Income</p>
            <h3>{formatINR(overview?.totalIncome)}</h3>
          </div>

          <div className="analytics-stat-card">
            <div className="analytics-stat-icon expense-icon">
              <TrendingDown size={20} />
            </div>
            <p>Total Expenses</p>
            <h3>{formatINR(overview?.totalExpenses)}</h3>
          </div>

          <div className="analytics-stat-card">
            <div className="analytics-stat-icon balance-icon">
              <Wallet size={20} />
            </div>
            <p>Net Balance</p>
            <h3>{formatINR(overview?.netBalance)}</h3>
          </div>

          <div className="analytics-stat-card">
            <div className="analytics-stat-icon count-icon">
              <ArrowUpDown size={20} />
            </div>
            <p>Total Transactions</p>
            <h3>{overview?.totalTransactions ?? 0}</h3>
          </div>
        </div>
      </div>

      <div className="analytics-section">
        <h2>Monthly Financial Activity</h2>

        <div className="analytics-chart-card">
          {loading ? (
            <p className="analytics-empty">Loading chart...</p>
          ) : monthly?.dailyBreakdown?.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={monthly.dailyBreakdown}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => date.slice(8)}
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(value) => `₹${value}`}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value) => formatINR(value)}
                  labelFormatter={(date) => `Date: ${date}`}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="analytics-empty">
              No completed transactions found for this month.
            </p>
          )}
        </div>
      </div>

      <div className="analytics-section">
        <h2>Selected Month Summary</h2>

        <div className="analytics-stats-grid monthly-summary-grid">
          <div className="analytics-stat-card">
            <p>Monthly Income</p>
            <h3>{formatINR(summary?.totalIncome)}</h3>
          </div>

          <div className="analytics-stat-card">
            <p>Monthly Expenses</p>
            <h3>{formatINR(summary?.totalExpenses)}</h3>
          </div>

          <div className="analytics-stat-card">
            <p>Monthly Net</p>
            <h3>{formatINR(summary?.netBalance)}</h3>
          </div>

          <div className="analytics-stat-card">
            <p>Monthly Transactions</p>
            <h3>{summary?.totalTransactions ?? 0}</h3>
          </div>
        </div>
      </div>

      <div className="analytics-section">
        <h2>Wallet Performance</h2>

        {wallets.length === 0 ? (
          <div className="analytics-chart-card analytics-empty">
            No wallets available yet.
          </div>
        ) : (
          <div className="analytics-wallet-grid">
            {wallets.map((wallet) => (
              <div className="analytics-wallet-card" key={wallet.id}>
                <div>
                  <h3>{wallet.label}</h3>
                  <span>{wallet.network}</span>
                </div>

                <div className="analytics-wallet-details">
                  <div>
                    <span>Income</span>
                    <strong>{formatINR(wallet.income)}</strong>
                  </div>

                  <div>
                    <span>Expenses</span>
                    <strong>{formatINR(wallet.expenses)}</strong>
                  </div>

                  <div>
                    <span>Transfers In</span>
                    <strong>{formatINR(wallet.transfersIn)}</strong>
                  </div>

                  <div>
                    <span>Transfers Out</span>
                    <strong>{formatINR(wallet.transfersOut)}</strong>
                  </div>

                  <div>
                    <span>Net Activity</span>
                    <strong>{formatINR(wallet.netActivity)}</strong>
                  </div>

                  <div>
                    <span>Transactions</span>
                    <strong>{wallet.totalTransactions}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
