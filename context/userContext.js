// src/context/userContext.js

"use client";
import { createContext, useContext, useState, useEffect } from 'react';

// 1. Create the context
const UserContext = createContext(null);

// 2. Create the Provider component
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add a loading state

  useEffect(() => {
    // Function to load user from localStorage
    const loadUser = () => {
      const storedUserId = localStorage.getItem('userId');
      
      if (storedUserId) {
        // Build the user object from everything you've stored
        setUser({
          id: storedUserId,
          email: localStorage.getItem('userEmail'),
          name: localStorage.getItem('userName'),
          phone: localStorage.getItem('userPhone')
        });
      } else {
        setUser(null);
      }
      setLoading(false); // Finished loading
    };

    // Initial load
    loadUser();

    // Listen for storage changes (e.g., from login in another tab or after logout)
    const handleStorageChange = (e) => {
      if (e.key === 'userId' || e.key === null) {
        loadUser();
      }
    };

    // Listen for custom event when login happens in same tab
    const handleUserUpdate = () => {
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdated', handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []); // Empty dependency array means this runs once on mount

  // The value will contain the user object and the loading state
  const value = { user, loading };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// 3. Create a custom hook for easy access
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}