
import React, { useCallback, useEffect, useState } from "react";
import {
  Plus, RefreshCw, ArrowDownLeft, ArrowUpRight,
  ArrowLeftRight, Eye, X, ChevronLeft, ChevronRight
} from "lucide-react";

import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction
} from "../api/transactions.js";

import { getWallets } from "../api/wallet.js";

const initialForm = {
  type: "EXPENSE",
  amount: "",
  currency: "INR",
  description: "",
  reference: "",
  sourceWalletId: "",
  destinationWalletId: "",
  occurredAt: new Date().toISOString().slice(0, 16)
};

const formatAmount = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number(amount || 0));

const formatDate = (date) =>
  date ? new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }) : "—";

const shortId = (id) => id ? `${id.slice(0, 8)}...` : "—";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    type: "",
    status: "",
    walletId: ""
  });

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    description: "",
    reference: ""
  });
  const [savingDetails, setSavingDetails] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getTransactions({
        page,
        limit: 10,
        ...filters
      });

      setTransactions(response.transactions || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load transactions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchWallets = useCallback(async () => {
    try {
      const data = await getWallets();
      setWallets(data || []);
    } catch (err) {
      console.error("Unable to load wallets:", err);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const openCreateModal = () => {
    setForm({
      ...initialForm,
      occurredAt: new Date().toISOString().slice(0, 16)
    });
    setFormError("");
    setShowModal(true);
  };

  const closeCreateModal = () => {
    if (submitting) return;
    setShowModal(false);
    setFormError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleCreateTransaction = async (event) => {
    event.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }

    if (form.type === "INCOME" && !form.destinationWalletId) {
      setFormError("Select the wallet receiving this income.");
      return;
    }

    if (form.type === "EXPENSE" && !form.sourceWalletId) {
      setFormError("Select the wallet used for this expense.");
      return;
    }

    if (form.type === "TRANSFER") {
      if (!form.sourceWalletId || !form.destinationWalletId) {
        setFormError("Select both source and destination wallets.");
        return;
      }

      if (form.sourceWalletId === form.destinationWalletId) {
        setFormError("Source and destination wallets must be different.");
        return;
      }
    }

    const payload = {
      type: form.type,
      amount: form.amount.trim(),
      currency: form.currency,
      description: form.description.trim() || undefined,
      reference: form.reference.trim() || undefined,
      occurredAt: form.occurredAt || undefined,
      sourceWalletId:
        form.type !== "INCOME" ? form.sourceWalletId : undefined,
      destinationWalletId:
        form.type !== "EXPENSE" ? form.destinationWalletId : undefined
    };

    try {
      setSubmitting(true);
      setFormError("");

      await createTransaction(payload);

      setShowModal(false);
      setPage(1);
      setFilters({ type: "", status: "", walletId: "" });

      // Fetch the first page after clearing filters.
      const response = await getTransactions({ page: 1, limit: 10 });
      setTransactions(response.transactions || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        "Unable to create transaction. Please check your details."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openDetails = async (transaction) => {
    setSelectedTransaction(transaction);
    setDetailLoading(true);
    setDetailError("");
    setEditingDetails(false);

    try {
      const fullTransaction = await getTransaction(transaction.id);
      setSelectedTransaction(fullTransaction);
      setEditForm({
        description: fullTransaction.description || "",
        reference: fullTransaction.reference || ""
      });
    } catch (err) {
      setDetailError(
        err.response?.data?.message ||
        "Unable to load transaction details."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedTransaction(null);
    setEditingDetails(false);
    setDetailError("");
  };

  const saveTransactionDetails = async (event) => {
    event.preventDefault();

    try {
      setSavingDetails(true);
      setDetailError("");

      const updated = await updateTransaction(selectedTransaction.id, {
        description: editForm.description.trim() || null,
        reference: editForm.reference.trim() || null
      });

      setSelectedTransaction((previous) => ({
        ...previous,
        ...updated
      }));

      setEditingDetails(false);
      await fetchTransactions();
    } catch (err) {
      setDetailError(
        err.response?.data?.message ||
        "Unable to update transaction details."
      );
    } finally {
      setSavingDetails(false);
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
    setPage(1);
  };

  const getWalletName = (transaction) => {
    if (transaction.type === "INCOME") {
      return transaction.destinationWallet?.label || "External source";
    }
    if (transaction.type === "EXPENSE") {
      return transaction.sourceWallet?.label || "External destination";
    }
    return `${transaction.sourceWallet?.label || "—"} → ${
      transaction.destinationWallet?.label || "—"
    }`;
  };

  const getTypeIcon = (type) => {
    if (type === "INCOME") return <ArrowDownLeft size={16} />;
    if (type === "EXPENSE") return <ArrowUpRight size={16} />;
    return <ArrowLeftRight size={16} />;
  };

  return (
    <div className="transactions-page">
      <div className="page-heading">
        <div>
          <h1>Transactions</h1>
          <p>Track, manage and review your financial activity.</p>
        </div>

        <div className="heading-actions">
          <button
            className="secondary-button"
            onClick={fetchTransactions}
            disabled={loading}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="primary-button" onClick={openCreateModal}>
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      <div className="transaction-summary">
        <div className="transaction-summary-card">
          <span>Total Transactions</span>
          <strong>{total}</strong>
        </div>
        <div className="transaction-summary-card">
          <span>Connected Wallets</span>
          <strong>{wallets.length}</strong>
        </div>
      </div>

      <div className="content-card transactions-list-card">
        <div className="section-heading">
          <div>
            <h3>Transaction History</h3>
            <p>Your latest recorded transactions</p>
          </div>
        </div>

        <div className="transaction-filters">
          <select name="type" value={filters.type} onChange={handleFilterChange}>
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </select>

          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            name="walletId"
            value={filters.walletId}
            onChange={handleFilterChange}
          >
            <option value="">All Wallets</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.label}
              </option>
            ))}
          </select>
        </div>

        {loading && <div className="transaction-message">Loading transactions...</div>}

        {!loading && error && (
          <div className="transaction-error">
            {error}
            <button onClick={fetchTransactions}>Try again</button>
          </div>
        )}

        {!loading && !error && transactions.length === 0 && (
          <div className="transaction-empty">
            <ArrowLeftRight size={38} />
            <h3>No transactions found</h3>
            <p>Add a transaction or change your filters.</p>
          </div>
        )}

        {!loading && !error && transactions.length > 0 && (
          <>
            <div className="table-wrapper">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>TRANSACTION</th>
                    <th>TYPE</th>
                    <th>WALLET</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                    <th>DATE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        <span className="transaction-id">
                          {shortId(transaction.id)}
                        </span>
                        <br />
                        <small>{transaction.description || "No description"}</small>
                      </td>
                      <td>
                        <span className={`transaction-type ${transaction.type.toLowerCase()}`}>
                          {getTypeIcon(transaction.type)}
                          {transaction.type}
                        </span>
                      </td>
                      <td>{getWalletName(transaction)}</td>
                      <td className={
                        transaction.type === "INCOME" ? "received" :
                        transaction.type === "EXPENSE" ? "sent" : ""
                      }>
                        {formatAmount(transaction.amount, transaction.currency)}
                      </td>
                      <td>
                        <span className={`status-badge ${
                          transaction.status?.toLowerCase() || "pending"
                        }`}>
                          {transaction.status || "PENDING"}
                        </span>
                      </td>
                      <td>{formatDate(transaction.occurredAt)}</td>
                      <td>
                        <button
                          className="transaction-view-button"
                          onClick={() => openDetails(transaction)}
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="transaction-pagination">
              <span>
                Page {page} of {totalPages} · {total} transactions
              </span>
              <div>
                <button
                  onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                  disabled={page <= 1 || loading}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
                  disabled={page >= totalPages || loading}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="transaction-modal-overlay">
          <div className="transaction-modal">
            <div className="transaction-modal-header">
              <div>
                <h2>Add Transaction</h2>
                <p>Record a new financial activity.</p>
              </div>
              <button onClick={closeCreateModal} disabled={submitting}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction}>
              <div className="transaction-form-group">
                <label>Transaction Type</label>
                <select name="type" value={form.type} onChange={handleFormChange}>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              <div className="transaction-form-row">
                <div className="transaction-form-group">
                  <label>Amount</label>
                  <input
                    name="amount"
                    type="number"
                    min="0.000000000000000001"
                    step="any"
                    placeholder="Enter amount"
                    value={form.amount}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="transaction-form-group">
                  <label>Currency</label>
                  <select name="currency" value={form.currency} onChange={handleFormChange}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
              </div>

              {form.type !== "INCOME" && (
                <div className="transaction-form-group">
                  <label>Source Wallet</label>
                  <select
                    name="sourceWalletId"
                    value={form.sourceWalletId}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select source wallet</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.type !== "EXPENSE" && (
                <div className="transaction-form-group">
                  <label>Destination Wallet</label>
                  <select
                    name="destinationWalletId"
                    value={form.destinationWalletId}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select destination wallet</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="transaction-form-group">
                <label>Description</label>
                <input
                  name="description"
                  maxLength="500"
                  placeholder="What is this transaction for?"
                  value={form.description}
                  onChange={handleFormChange}
                />
              </div>

              <div className="transaction-form-group">
                <label>Reference (optional)</label>
                <input
                  name="reference"
                  maxLength="100"
                  placeholder="Reference ID"
                  value={form.reference}
                  onChange={handleFormChange}
                />
              </div>

              <div className="transaction-form-group">
                <label>Transaction Date</label>
                <input
                  type="datetime-local"
                  name="occurredAt"
                  value={form.occurredAt}
                  onChange={handleFormChange}
                />
              </div>

              {formError && <p className="transaction-modal-error">{formError}</p>}

              <div className="transaction-modal-actions">
                <button type="button" className="secondary-button" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTransaction && (
        <div className="transaction-modal-overlay">
          <div className="transaction-modal">
            <div className="transaction-modal-header">
              <div>
                <h2>Transaction Details</h2>
                <p>{shortId(selectedTransaction.id)}</p>
              </div>
              <button onClick={closeDetails}><X size={20} /></button>
            </div>

            {detailLoading ? (
              <div className="transaction-message">Loading details...</div>
            ) : (
              <>
                {detailError && <p className="transaction-modal-error">{detailError}</p>}

                <div className="transaction-detail-list">
                  <div><span>Type</span><strong>{selectedTransaction.type}</strong></div>
                  <div><span>Amount</span><strong>{formatAmount(selectedTransaction.amount, selectedTransaction.currency)}</strong></div>
                  <div><span>Status</span><strong>{selectedTransaction.status}</strong></div>
                  <div><span>Source wallet</span><strong>{selectedTransaction.sourceWallet?.label || "—"}</strong></div>
                  <div><span>Destination wallet</span><strong>{selectedTransaction.destinationWallet?.label || "—"}</strong></div>
                  <div><span>Date</span><strong>{formatDate(selectedTransaction.occurredAt)}</strong></div>
                </div>

                {!editingDetails ? (
                  <>
                    <div className="transaction-detail-list">
                      <div><span>Description</span><strong>{selectedTransaction.description || "—"}</strong></div>
                      <div><span>Reference</span><strong>{selectedTransaction.reference || "—"}</strong></div>
                    </div>
                    <button
                      className="primary-button transaction-edit-details"
                      onClick={() => setEditingDetails(true)}
                    >
                      Edit Description / Reference
                    </button>
                  </>
                ) : (
                  <form onSubmit={saveTransactionDetails}>
                    <div className="transaction-form-group">
                      <label>Description</label>
                      <input
                        maxLength="500"
                        value={editForm.description}
                        onChange={(event) => setEditForm({
                          ...editForm,
                          description: event.target.value
                        })}
                      />
                    </div>
                    <div className="transaction-form-group">
                      <label>Reference</label>
                      <input
                        maxLength="100"
                        value={editForm.reference}
                        onChange={(event) => setEditForm({
                          ...editForm,
                          reference: event.target.value
                        })}
                      />
                    </div>
                    <div className="transaction-modal-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setEditingDetails(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={savingDetails}
                      >
                        {savingDetails ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
