import React, { useCallback, useEffect, useState } from "react";
import {
  Wallet as WalletIcon,
  RefreshCw,
  Copy,
  Plus,
  X,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  getWallets,
  createWallet,
  updateWallet,
  deleteWallet,
} from "../api/wallet.js";

const initialFormData = {
  label: "",
  address: "",
  network: "Ethereum",
};

export default function Wallet() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const isEditing = Boolean(editingWallet);

  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getWallets();
      setWallets(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load wallets. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const openAddModal = () => {
    setEditingWallet(null);
    setFormData(initialFormData);
    setModalError("");
    setShowModal(true);
  };

  const openEditModal = (wallet) => {
    setEditingWallet(wallet);
    setFormData({
      label: wallet.label || "",
      address: wallet.address || "",
      network: wallet.network || "Ethereum",
    });
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setEditingWallet(null);
    setFormData(initialFormData);
    setModalError("");
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmitWallet = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setModalError("");

      const walletData = {
        label: formData.label.trim(),
        address: formData.address.trim(),
        network: formData.network,
      };

      if (isEditing) {
        await updateWallet(editingWallet.id, walletData);
      } else {
        await createWallet(walletData);
      }

      setShowModal(false);
      setEditingWallet(null);
      setFormData(initialFormData);
      await fetchWallets();
    } catch (err) {
      setModalError(
        err.response?.data?.message ||
          `Unable to ${isEditing ? "update" : "add"} wallet. Please check your details.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (wallet) => {
    setDeleteTarget(wallet);
    setDeleteError("");
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  const handleDeleteWallet = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteWallet(deleteTarget.id);

      setDeleteTarget(null);
      await fetchWallets();
    } catch (err) {
      setDeleteError(
        err.response?.data?.message ||
          "Unable to delete wallet. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const copyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      setError("Unable to copy wallet address.");
    }
  };

  const shortenAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <div className="wallet-page">
      <div className="page-heading">
        <div>
          <h1>My Wallets</h1>
          <p>Manage and monitor your connected wallets.</p>
        </div>

        <div className="heading-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={fetchWallets}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={openAddModal}
          >
            <Plus size={16} />
            Add Wallet
          </button>
        </div>
      </div>

      <div className="wallet-summary">
        <div className="wallet-summary-card">
          <div className="wallet-summary-icon">
            <WalletIcon size={20} />
          </div>
          <p>Total Wallets</p>
          <h2>{wallets.length}</h2>
        </div>

        <div className="wallet-summary-card">
          <div className="wallet-summary-icon">
            <WalletIcon size={20} />
          </div>
          <p>Connected Network</p>
          <h2>Ethereum</h2>
        </div>
      </div>

      <div className="content-card wallet-list-section">
        <div className="section-heading">
          <div>
            <h3>Connected Wallets</h3>
            <p>Your registered wallet addresses</p>
          </div>
        </div>

        {loading && (
          <div className="wallet-message">Loading your wallets...</div>
        )}

        {!loading && error && (
          <div className="wallet-error">
            {error}
            <button type="button" onClick={fetchWallets}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && wallets.length === 0 && (
          <div className="wallet-empty">
            <WalletIcon size={38} />
            <h3>No wallets added yet</h3>
            <p>Add your first Ethereum wallet to get started.</p>
          </div>
        )}

        {!loading && !error && wallets.length > 0 && (
          <div className="wallet-grid">
            {wallets.map((wallet) => (
              <div className="wallet-card" key={wallet.id}>
                <div className="wallet-card-top">
                  <div className="wallet-card-icon">
                    <WalletIcon size={21} />
                  </div>
                  <span className="wallet-network">{wallet.network}</span>
                </div>

                <h3>{wallet.label}</h3>

                <div className="wallet-address">
                  <span>{shortenAddress(wallet.address)}</span>
                  <button
                    type="button"
                    onClick={() => copyAddress(wallet.address)}
                    title="Copy wallet address"
                    aria-label="Copy wallet address"
                  >
                    <Copy size={15} />
                  </button>
                </div>

                <div className="wallet-card-footer">
                  <span>
                    Added{" "}
                    {wallet.createdAt
                      ? new Date(wallet.createdAt).toLocaleDateString()
                      : "—"}
                  </span>

                  <div className="wallet-card-actions">
                    <button
                      type="button"
                      className="wallet-edit-button"
                      onClick={() => openEditModal(wallet)}
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      className="wallet-delete-button"
                      onClick={() => openDeleteModal(wallet)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Wallet Modal */}
      {showModal && (
        <div className="wallet-modal-overlay" onClick={closeModal}>
          <div
            className="wallet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wallet-modal-header">
              <div>
                <h2 id="wallet-modal-title">
                  {isEditing ? "Edit Wallet" : "Add New Wallet"}
                </h2>
                <p>
                  {isEditing
                    ? "Update your registered wallet details."
                    : "Register a wallet address in ChainLedger."}
                </p>
              </div>

              <button
                type="button"
                className="wallet-modal-close"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitWallet}>
              <div className="wallet-form-group">
                <label htmlFor="wallet-label">Wallet Name</label>
                <input
                  id="wallet-label"
                  type="text"
                  name="label"
                  placeholder="e.g. My Main Wallet"
                  value={formData.label}
                  onChange={handleInputChange}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </div>

              <div className="wallet-form-group">
                <label htmlFor="wallet-address">Ethereum Address</label>
                <input
                  id="wallet-address"
                  type="text"
                  name="address"
                  placeholder="0x..."
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="wallet-form-group">
                <label htmlFor="wallet-network">Network</label>
                <select
                  id="wallet-network"
                  name="network"
                  value={formData.network}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Ethereum">Ethereum</option>
                  <option value="Sepolia">Sepolia</option>
                  <option value="Polygon">Polygon</option>
                  <option value="Arbitrum">Arbitrum</option>
                  <option value="Optimism">Optimism</option>
                </select>
              </div>

              {modalError && (
                <div className="wallet-modal-error">{modalError}</div>
              )}

              <div className="wallet-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting}
                >
                  {submitting
                    ? isEditing
                      ? "Saving..."
                      : "Adding..."
                    : isEditing
                      ? "Save Changes"
                      : "Add Wallet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Wallet Confirmation Modal */}
      {deleteTarget && (
        <div
          className="wallet-modal-overlay"
          onClick={closeDeleteModal}
        >
          <div
            className="wallet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-wallet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wallet-modal-header">
              <div>
                <h2 id="delete-wallet-title">Delete Wallet?</h2>
                <p>Are you sure you want to delete this wallet?</p>
              </div>

              <button
                type="button"
                className="wallet-modal-close"
                onClick={closeDeleteModal}
                disabled={deleting}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="delete-wallet-details">
              <strong>{deleteTarget.label}</strong>
              <span>{deleteTarget.address}</span>
              <span>Network: {deleteTarget.network}</span>
            </div>

            <p className="delete-wallet-warning">
              This action cannot be undone.
            </p>

            {deleteError && (
              <div className="wallet-modal-error">{deleteError}</div>
            )}

            <div className="wallet-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="wallet-confirm-delete"
                onClick={handleDeleteWallet}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
