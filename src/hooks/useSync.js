// Sync is now handled by Supabase. This stub is kept for backward compatibility.
// Components that previously used sync prop drilling have been updated.

export const SyncStatus = {
  DISCONNECTED: 'disconnected',
  SYNCED: 'synced',
}

export default function useSync() {
  return {
    status: SyncStatus.SYNCED,
    isConnected: true,
    remoteData: null,
    lastSyncAt: null,
    error: null,
    connect: () => {},
    connectWithGistId: () => {},
    disconnect: () => {},
    forcePush: () => {},
  }
}