import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LockContextType {
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  isNavigationBlocked: boolean;
  setNavigationBlocked: (blocked: boolean) => void;
}

const LockContext = createContext<LockContextType | undefined>(undefined);

interface LockProviderProps {
  children: ReactNode;
}

export const LockProvider: React.FC<LockProviderProps> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isNavigationBlocked, setNavigationBlocked] = useState(false);

  // Auto-block navigation when locked
  useEffect(() => {
    setNavigationBlocked(isLocked);
  }, [isLocked]);

  const value: LockContextType = {
    isLocked,
    setIsLocked,
    isNavigationBlocked,
    setNavigationBlocked,
  };

  return (
    <LockContext.Provider value={value}>
      {children}
    </LockContext.Provider>
  );
};

export const useLock = (): LockContextType => {
  const context = useContext(LockContext);
  if (context === undefined) {
    throw new Error('useLock must be used within a LockProvider');
  }
  return context;
};

export default LockContext; 