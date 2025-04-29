// context/AuthContext.tsx
import { jwtDecode } from 'jwt-decode';
import React, { createContext, useState, useEffect, useContext } from 'react';

export interface User {
  id: string;
  username: string;
  // email: string;
  authToken: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: { username: string; authToken: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

interface DecodedToken {
  id: string;
  username: string;
  exp: number;
  iat: number;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const login = (userData: { username: string; authToken: string }) => {
    try {
      // Decode the token to get the user ID
      const decodedToken = jwtDecode<DecodedToken>(userData.authToken);

      // Create the user object with ID from token
      const user = {
        id: decodedToken.id,
        username: userData.username,
        authToken: userData.authToken,
      };

      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error decoding token:', error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => useContext(AuthContext);
