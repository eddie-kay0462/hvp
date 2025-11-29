import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const baseURL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const secretKey = process.env.PAYSTACK_SECRET_KEY || '';

export const paystackClient = axios.create({
  baseURL,
  headers: {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

export const initializeTransaction = async ({ email, amount, currency = 'GHS', callback_url, metadata }) => {
  const { data } = await paystackClient.post('/transaction/initialize', {
    email,
    amount,
    currency,
    callback_url,
    metadata
  });
  return data;
};

export const verifyTransaction = async (reference) => {
  const { data } = await paystackClient.get(`/transaction/verify/${encodeURIComponent(reference)}`);
  return data;
};


