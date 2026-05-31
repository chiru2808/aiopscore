import { api } from '@/lib/api';

export const billingApi = {
  createCheckoutSession: async (projectId: string): Promise<string> => {
    const response = await api.post<{ url: string }>('/v1/billing/checkout');
    return response.url;
  },
};
