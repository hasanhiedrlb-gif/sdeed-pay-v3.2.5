import { getToken } from './auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_UI ||
  '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message || `Request failed with status ${res.status}`, res.status);
  }

  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; admin: { id: string; email: string; role: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),

  getWallets: () => request<any[]>('/wallets'),

  getWallet: (userId: string) =>
    request<{ userId: string; balance: string; currency: string }>(`/wallets/${userId}`),

  topup: (userId: string, amount: number, description?: string) =>
    request('/wallets/topup', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, description }),
    }),

  payout: (userId: string, amount: number, description?: string) =>
    request('/wallets/payout', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, description }),
    }),

  getTransactions: (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => !!v) as [string, string][],
    ).toString();
    return request<any[]>(`/transactions${query ? `?${query}` : ''}`);
  },
};
