'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export default function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const initSync = useWorkspaceStore(state => state.initSync);

  useEffect(() => {
    initSync();
  }, [initSync]);

  return <>{children}</>;
}
