import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProfileContainer } from './UserProfileStyles';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { FriendsSection } from '../components/profile/FriendsSection';
import { MatchHistorySection } from '../components/profile/MatchHistorySection';
import { StatsSection } from '../components/profile/StatsSection';
import { useUserProfile } from '../hooks/useUserProfile';
import { useFriends } from '../hooks/useFriends';
import { useMatches } from '../hooks/useMatches';
import { useStats }   from '../hooks/useStats';

const UserProfile: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const { user: currentUser } = useAuth();
  const targetUsername = username || currentUser?.username;

  // Use custom hooks for data fetching and logic
  const { userProfile, loading } = useUserProfile(targetUsername);

  const {
    friends,
    isFriend,
    handleAddFriend,
    handleRemoveFriend,
    getFriendshipId,
  } = useFriends(targetUsername, userProfile, currentUser);

  // const { matches, formatDate } = useMatches(userProfile?.id);
  const { matches, formatDate } = useMatches(targetUsername);
  const { stats, loading: statsLoading, error: statsError } = useStats(targetUsername);

  // Render loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Render error state
  if (!userProfile) {
    return <div>User not found</div>;
  }

  const isCurrentUser = currentUser?.id === userProfile.id;

  // Render the profile
  return (
    <ProfileContainer>
      {/* Profile Header with user info and friend buttons */}
      <ProfileHeader
        userProfile={userProfile}
        isCurrentUser={isCurrentUser}
        isFriend={isFriend}
        onAddFriend={handleAddFriend}
        onRemoveFriend={handleRemoveFriend}
        getFriendshipId={getFriendshipId}
      />

      {/* Friends list section */}
      {isCurrentUser && <FriendsSection friends={friends} />}

      {/* only show stats once loaded */}
      {!statsLoading && stats && <StatsSection stats={stats} />}
      {statsLoading && <div>Loading stats…</div>}
      {statsError   && <div className="error">Error loading stats</div>}

      {/* Match history section */}
      <MatchHistorySection matches={matches} formatDate={formatDate} />
    </ProfileContainer>
  );
};

export default UserProfile;
