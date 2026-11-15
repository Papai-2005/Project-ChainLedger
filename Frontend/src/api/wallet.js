import api from "./axios.js";

// Fetch all wallets
export const getWallets = async () => {
  const response = await api.get("/wallets");
  return response.data.wallets;
};

// Create a new wallet
export const createWallet = async (walletData) => {
  const response = await api.post("/wallets", walletData);
  return response.data.wallet;
};

// Update an existing wallet
export const updateWallet = async (walletId, walletData) => {
  const response = await api.patch(
    `/wallets/${walletId}`,
    walletData
  );

  return response.data.wallet;
};

// Delete a wallet
export const deleteWallet = async (walletId) => {
  const response = await api.delete(`/wallets/${walletId}`);
  return response.data;
};
