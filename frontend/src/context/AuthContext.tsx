// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from 'react'

export interface User {
  //id: number
  //username: string
  authToken: string
}

interface AuthContextShape {
  user:   User | null
  login:  (u: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextShape>({
  user:   null,
  login:  () => {},
  logout: () => {},
})

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const raw = sessionStorage.getItem('authUser')
    return raw ? (JSON.parse(raw) as User) : null
  })

  useEffect(() => {
    if (user)
      sessionStorage.setItem('authUser', JSON.stringify(user))
    else
      sessionStorage.removeItem('authUser')
  }, [user])

  const login  = (u: User) => setUser(u)
  const logout = ()         => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
