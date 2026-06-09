import axios from 'axios';
import { getSession } from 'next-auth/react';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests (includes JWT from NextAuth)
});

api.interceptors.request.use(
  async (config) => {
    const session = await getSession();

    const orgId = session?.orgId || (session?.user as any)?.orgId;
    if (orgId) {
      config.headers['X-Org-Id'] = orgId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/signin';
    }
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error || 'Access denied';
      if (errorMessage === 'Insufficient permissions' || errorMessage === 'Access denied') {
        console.error('Access denied:', errorMessage);
      }
    }
    return Promise.reject(error);
  }
);

