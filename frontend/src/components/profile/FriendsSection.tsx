import React from 'react';
import { Link } from 'react-router-dom';
import UserCard from './UserCard';
import {
  Section,
  SectionTitle,
  FriendsList,
  EmptyState,
} from '../../pages/UserProfileStyles';

interface Friend {
  id: number;
  username: string;
  online_status: string;
  friendshipId: number;
}

interface FriendsSectionProps {
  friends: Friend[];
}

export const FriendsSection: React.FC<FriendsSectionProps> = ({ friends }) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8888';

  return (
    <Section>
      <SectionTitle>Friends</SectionTitle>
      {friends.length > 0 ? (
        <FriendsList>
          {friends.map((friend) => (
            <Link
              key={friend.id}
              to={`/profile/${friend.username}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <UserCard
                id={friend.id}
                username={friend.username}
                avatar={`${apiUrl}/user/${friend.username}/avatar`}
                online_status={friend.online_status || 'offline'}
              />
            </Link>
          ))}
        </FriendsList>
      ) : (
        <EmptyState>No friends yet</EmptyState>
      )}
    </Section>
  );
};
