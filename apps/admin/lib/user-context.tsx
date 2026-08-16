'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SpUser, UserRole } from './sdeedpay-types';
import { sdeedpayApi } from './sdeedpay-api';

interface UserContextValue {
  currentUser: SpUser | null;
  users: SpUser[];
  setCurrentUser: (user: SpUser) => void;
  refreshUsers: () => Promise<void>;
  loading: boolean;
  switchRole: (role: UserRole) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<SpUser[]>([]);
  const [currentUser, setCurrentUser] = useState<SpUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUsers() {
    try {
      const data = await sdeedpayApi.getUsers();
      setUsers(data);
      if (!currentUser && data.length > 0) {
        // Default to admin or worker
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('sdeedpay_active_user') : null;
        const matched = savedId ? data.find((u) => u.id === savedId) : null;
        setCurrentUser(matched || data.find((u) => u.role === 'admin') || data[0]);
      } else if (currentUser) {
        const updated = data.find((u) => u.id === currentUser.id);
        if (updated) setCurrentUser(updated);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUsers();
  }, []);

  function handleSetUser(user: SpUser) {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sdeedpay_active_user', user.id);
    }
  }

  function switchRole(role: UserRole) {
    const candidate = users.find((u) => u.role === role);
    if (candidate) {
      handleSetUser(candidate);
    }
  }

  return (
    <UserContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser: handleSetUser,
        refreshUsers,
        loading,
        switchRole,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
}
