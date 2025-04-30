import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { customFetch } from '../utils';

export const useUserProfile = (username: string | undefined) => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (!username) return;

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await customFetch.get(`/user/${username}`);
        setUserProfile(response.data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username]);

  return {
    userProfile,
    loading,
    isCurrentUser: currentUser?.id === userProfile?.id,
  };
};
