import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLocalStorage } from './useLocalStorage';

export type User = {
  //   id: string;
  //   username: string;
  //   email: string;
  authToken?: string;
};

export const useUser = () => {
  const { user, setUser } = useContext(AuthContext);
  const { setItem } = useLocalStorage();

  const addUser = (user: User) => {
    console.log('Adding user to AuthContext:', user);
    setUser(user);
    setItem('user', JSON.stringify(user));
  };

  const removeUser = () => {
    console.log('Removing user from AuthContext');
    setUser(null);
    setItem('user', '');
  };

  return { user, addUser, removeUser, setUser };
};
