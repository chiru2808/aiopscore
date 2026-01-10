// Stub API for git-sync feature
export const gitSyncApi = {
  disconnect: async (projectId: string) => {
    // Stub: no-op
    return Promise.resolve();
  },
  
  push: async (projectId: string, commitMessage: string) => {
    // Stub: no-op
    return Promise.resolve();
  },
};
