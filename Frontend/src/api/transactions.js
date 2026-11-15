import api from "./axios.js";

export const getTransactions = async (params = {}) => {
  const response = await api.get("/transactions", { params });
  return response.data;
};

export const getTransaction = async (transactionId) => {
  const response = await api.get(`/transactions/${transactionId}`);
  return response.data.transaction;
};

export const createTransaction = async (transactionData) => {
  const response = await api.post("/transactions", transactionData);
  return response.data.transaction;
};

export const updateTransaction = async (transactionId, transactionData) => {
  const response = await api.patch(
    `/transactions/${transactionId}`,
    transactionData
  );
  return response.data.transaction;
};