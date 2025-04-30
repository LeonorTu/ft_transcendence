import React, { useRef } from 'react';
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
  AvatarEditOverlay,
} from '../../pages/UserProfileStyles';
import { customFetch } from '../../utils';

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (isCurrentUser && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !currentUser) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      await customFetch.put(
        `/user/${currentUser.username}/upload_avatar`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${currentUser.authToken}`,
          },
        }
      );

      const avatarImg =
        document.querySelector<HTMLImageElement>('.profile-avatar');
      if (avatarImg) {
        avatarImg.src = `${apiUrl}/user/${
          userProfile.username
        }/avatar?t=${Date.now()}`;
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  return (
    <Header>
      <AvatarContainer>
        <ProfileAvatar
          src={`${apiUrl}/user/${userProfile.username}/avatar?t=${Date.now()}`}
          alt={`${userProfile.username}'s avatar`}
          onClick={handleAvatarClick}
          style={{ cursor: isCurrentUser ? 'pointer' : 'default' }}
        />
        {isCurrentUser && <AvatarEditOverlay>Edit</AvatarEditOverlay>}
        <StatusIndicator online={isOnline} />


        <input
          type='file'
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept='image/*'
          onChange={handleFileChange}
        />
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
