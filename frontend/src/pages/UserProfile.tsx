import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import UserCard from './UserCard';
import { useAuth } from '../context/AuthContext';
import { customFetch } from '../utils';
import {
  ProfileContainer,
  ProfileHeader,
  AvatarContainer,
  ProfileAvatar,
  StatusIndicator,
  ProfileInfo,
  Username,
  ButtonContainer,
  Button,
  SectionTitle,
  FriendsList,
  MatchHistory,
  MatchCard,
  MatchAvatar,
  MatchInfo,
  MatchResult,
  MatchScore,
  MatchDate,
  EmptyState
} from './UserProfileStyles';

// Types
interface Friend {
  id: number;
  username: string;
  avatar: string;
  online_status: string;
  friendshipId: number; // Needed for removing friends
}

interface Match {
  id: number;
  opponent: string;
  opponentAvatar: string;
  result: 'win' | 'loss';
  score: string;
  date: string;
}

const UserProfile: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const { user: currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [myFriends, setMyFriends] = useState<Friend[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);

  // Determine which username to use for API calls
  const targetUsername = username || currentUser?.username;

  // Fetch user profile
  useEffect(() => {
    if (!targetUsername) return;

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        // Use the targetUsername for API calls
        const response = await customFetch.get(`/user/${targetUsername}`);
        setUserProfile(response.data);

        // setIsFriend(
        //   currentUser?.id !== response.data.id &&
        //     friends.some((friend) => friend.id === response.data.id)
        // );
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [targetUsername, currentUser, friends]);

  // Also update the friends fetch:
  useEffect(() => {
    if (!targetUsername) return;

    const fetchFriends = async () => {
      try {
        const response = await customFetch.get(
          `/user/${targetUsername}/friends`
        );
        setFriends(response.data);
        console.log('1', friends);
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };

    fetchFriends();
  }, [targetUsername]);

  // Fetch current user's friends (not the profile's friends)
  useEffect(() => {
    if (!currentUser?.username) return;

    const fetchMyFriends = async () => {
      try {
        const response = await customFetch.get(
          `/user/${currentUser.username}/friends`,
          {
            headers: {
              Authorization: `Bearer ${currentUser.authToken}`,
            },
          }
        );
        setMyFriends(response.data);
        // Set isFriend if the profile user is in the current user's friends
        if (userProfile) {
          const isFriendWithUser = response.data.some(
            (friend: Friend) => friend.id === userProfile.id
          );
          setIsFriend(isFriendWithUser);
        }
      } catch (error) {
        console.error('Error fetching my friends:', error);
      }
    };

    fetchMyFriends();
  }, [currentUser, userProfile]);

  // Mock match history data (replace with real API call when available)
  useEffect(() => {
    // This is placeholder data - replace with actual API call when available
    const mockMatches: Match[] = [
      {
        id: 1,
        opponent: 'player1',
        opponentAvatar: 'https://i.pravatar.cc/150?img=1',
        result: 'win',
        score: '10-8',
        date: '2023-04-15T14:30:00Z',
      },
      {
        id: 2,
        opponent: 'player2',
        opponentAvatar: 'https://i.pravatar.cc/150?img=2',
        result: 'loss',
        score: '5-10',
        date: '2023-04-10T18:45:00Z',
      },
      {
        id: 3,
        opponent: 'player3',
        opponentAvatar: 'https://i.pravatar.cc/150?img=3',
        result: 'win',
        score: '10-7',
        date: '2023-04-05T12:15:00Z',
      },
    ];
    setMatches(mockMatches);
  }, []);

  // Add friend functionality
  const handleAddFriend = async () => {
    if (!userProfile || !currentUser) return;

    try {
      const response = await customFetch.post(
        `/add_friend`,
        {
          user_id: currentUser.id,
          friend_id: userProfile.id,
        },
        {
          headers: {
            Authorization: `Bearer ${currentUser.authToken}`,
          },
        }
      );

      // Refetch friends to update the list
      const friendsResponse = await customFetch.get(
        `/user/${username}/friends`
      );
      setFriends(friendsResponse.data);
      setIsFriend(true);
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  // Remove friend functionality
  const handleRemoveFriend = async (friendshipId: number) => {
    if (!currentUser) return;
    try {
      const response = await customFetch.delete(
        `/remove_friend/${friendshipId}`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.authToken}`,
          },
        }
      );

      // Update the friends list by filtering out the removed friend
      setFriends(
        friends.filter((friend) => friend.friendshipId !== friendshipId)
      );

      if (userProfile && userProfile.id) {
        setIsFriend(false);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  // Format date for the match history
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userProfile) {
    return <div>User not found</div>;
  }

  const isCurrentUser = currentUser?.id === userProfile.id;
  const isOnline = userProfile.online_status === 'online';
  return (
    <ProfileContainer>
      <ProfileHeader>
        <AvatarContainer>
          <ProfileAvatar
            src={`${
              import.meta.env.VITE_API_URL || 'http://localhost:8888'
            }/user/${userProfile.username}/avatar`}
            alt={`${userProfile.username}'s avatar`}
          />
          <StatusIndicator online={isOnline} />
        </AvatarContainer>

        <ProfileInfo>
          <Username>{userProfile.username}</Username>
          {userProfile.bio && <p>{userProfile.bio}</p>}
        </ProfileInfo>

        {!isCurrentUser && (
          <ButtonContainer>
            {isFriend ? (
              <Button
                onClick={() => {
                  if (!currentUser) return;
                  const friendship = myFriends.find(
                    (f) => f.id === userProfile.id
                  );
                  if (friendship) handleRemoveFriend(friendship.friendshipId);
                }}
              >
                Remove Friend
              </Button>
            ) : (
              <Button onClick={handleAddFriend}>Add Friend</Button>
            )}
          </ButtonContainer>
        )}
      </ProfileHeader>

      {/* Friends Section */}
      <div>
        <SectionTitle>Friends</SectionTitle>
        {friends.length > 0 ? (
          <FriendsList>
            {friends.map((friend) => (
              <Link
                key={friend.id}
                to={`/profile/${friend.username}`} // Link to the friend's profile
                style={{ textDecoration: 'none', color: 'inherit' }} // Optional: Remove link styling
              >
                <UserCard
                  key={friend.id}
                  id={friend.id}
                  username={friend.username}
                  avatar={`${
                    import.meta.env.VITE_API_URL || 'http://localhost:8888'
                  }/user/${friend.username}/avatar`}
                  online_status={friend.online_status || 'offline'}
                />
              </Link>
            ))}
          </FriendsList>
        ) : (
          <EmptyState>No friends yet</EmptyState>
        )}
      </div>

      {/* Match History Section */}
      <div>
        <SectionTitle>Match History</SectionTitle>
        {matches.length > 0 ? (
          <MatchHistory>
            {matches.map((match) => (
              <MatchCard key={match.id} result={match.result}>
                <MatchAvatar
                  src={match.opponentAvatar}
                  alt={`${match.opponent}'s avatar`}
                />
                <MatchInfo>
                  <div>
                    vs. <strong>{match.opponent}</strong>
                  </div>
                  <MatchResult result={match.result}>
                    {match.result}
                  </MatchResult>
                </MatchInfo>
                <MatchScore>{match.score}</MatchScore>
                <MatchDate>{formatDate(match.date)}</MatchDate>
              </MatchCard>
            ))}
          </MatchHistory>
        ) : (
          <EmptyState>No matches played yet</EmptyState>
        )}
      </div>
    </ProfileContainer>
  );
};

export default UserProfile;
