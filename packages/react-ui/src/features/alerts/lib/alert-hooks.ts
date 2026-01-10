import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Stub alert hooks to replace missing EE feature
export const alertQueries = {
  useAlertsEmailList: () => {
    return useQuery({
      queryKey: ['alerts'],
      queryFn: () => Promise.resolve([]),
    });
  },
};

export const alertMutations = {
  useDeleteAlert: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (alert: any) => {
        // Stub: no-op
        return Promise.resolve();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      },
    });
  },
  
  useAddAlert: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (email: string) => {
        // Stub: no-op
        return Promise.resolve();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
      },
    });
  },
};
