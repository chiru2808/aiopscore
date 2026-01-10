// Stub hooks for git-sync feature
export const gitSyncHooks = {
  useGitSync: (projectId: string, environmentsEnabled: boolean) => {
    return {
      gitSync: null,
    };
  },
};
