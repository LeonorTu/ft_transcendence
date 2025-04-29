import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import UserCard from './UserCard';
import { useAuth } from '../context/AuthContext';
import { customFetch } from '../utils';

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

// Styled Components
const ProfileContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  color: white;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: #333;
  color: white;
  border: 2px solid #555;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #444;
    border-color: #00ffaa;
  }
`;

const SectionTitle = styled.h2`
  font-family: 'Press Start 2P', cursive;
  font-size: 1.5rem;
  color: #fff;
  margin-bottom: 1rem;
  border-bottom: 2px solid #333;
  padding-bottom: 0.5rem;
`;

const FriendsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const MatchHistory = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

const MatchCard = styled.div<{ result: 'win' | 'loss' }>`
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: ${({ result }) =>
    result === 'win' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'};
  border: 1px solid
    ${({ result }) => (result === 'win' ? '#4caf50' : '#f44336')};
  border-radius: 8px;
`;

const MatchAvatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 1rem;
`;

const MatchInfo = styled.div`
  flex: 1;
`;

const MatchResult = styled.span<{ result: 'win' | 'loss' }>`
  color: ${({ result }) => (result === 'win' ? '#4caf50' : '#f44336')};
  font-weight: bold;
  text-transform: uppercase;
`;

const MatchScore = styled.div`
  font-family: 'Press Start 2P', cursive;
  font-size: 1rem;
`;

const MatchDate = styled.div`
  color: #999;
  font-size: 0.8rem;
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #777;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
`;

const UserProfile: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const { user: currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);

  // Determine which username to use for API calls
  const targetUsername = username || currentUser?.username;
  console.log(username);

  // Fetch user profile
  useEffect(() => {
    if (!targetUsername) return;

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        // Use the targetUsername for API calls
        const response = await customFetch.get(`/user/${targetUsername}`);
        setUserProfile(response.data);

        // Check if this is the current user's profile
        setIsFriend(
          currentUser?.username !== response.data.username &&
            friends.some((friend) => friend.username === response.data.username)
        );
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
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };

    fetchFriends();
  }, [targetUsername]);

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
      console.log('user id:', currentUser.id);
      console.log('friend id:', userProfile.id);

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
    try {
      const response = await fetch(`/remove_friend/${friendshipId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove friend');

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
  console.log(friends[0]);

  return (
    <ProfileContainer>
      <ProfileHeader>
        <UserCard
          id={userProfile.id}
          username={userProfile.username}
          avatar={`http://localhost:8888/user/${userProfile.username}/avatar`}
          online_status={userProfile.online_status || 'offline'}
        />

        <ProfileInfo>
          <h1>{userProfile.username}</h1>
          {userProfile.bio && <p>{userProfile.bio}</p>}
        </ProfileInfo>

        {!isCurrentUser && (
          <ButtonContainer>
            {isFriend ? (
              <Button
                onClick={() => {
                  const friendship = friends.find(
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
              <UserCard
                key={friend.id}
                id={friend.id}
                username={friend.username}
                avatar={`http://localhost:8888/user/${friend.username}/avatar`}
                online_status={friend.online_status || 'offline'}
              />
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
