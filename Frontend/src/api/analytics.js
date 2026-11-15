
import api from "./axios.js";

export const getAnalyticsOverview = async () => {
  const response = await api.get("/analytics/overview");
  return response.data;
};

export const getMonthlyAnalytics = async (year, month) => {
  const response = await api.get("/analytics/monthly", {
    params: { year, month },
  });
  return response.data;
};

export const getWalletAnalytics = async () => {
  const response = await api.get("/analytics/wallets");
  return response.data;
};
