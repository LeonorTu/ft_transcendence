import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ProfileHeader as Header,
  AvatarContainer,
  ProfileAvatar,
  StatusIndicator,
  ProfileInfo,
  Username,
  ButtonContainer,
  Button,
} from '../../pages/UserProfileStyles';

interface ProfileHeaderProps {
  userProfile: any;
  isCurrentUser: boolean;
  isFriend: boolean;
  myFriends: any[];
  onAddFriend: () => void;
  onRemoveFriend: (friendshipId: number) => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userProfile,
  isCurrentUser,
  isFriend,
  myFriends,
  onAddFriend,
  onRemoveFriend,
}) => {
  const { user: currentUser } = useAuth();
  const isOnline = userProfile.online_status === 'online';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8888';

  return (
    <Header>
      <AvatarContainer>
        <ProfileAvatar
          src={`${apiUrl}/user/${userProfile.username}/avatar`}
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
                if (friendship) onRemoveFriend(friendship.friendshipId);
              }}
            >
              Remove Friend
            </Button>
          ) : (
            <Button onClick={onAddFriend}>Add Friend</Button>
          )}
        </ButtonContainer>
      )}
    </Header>
  );
};
