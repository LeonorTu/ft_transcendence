import { useState, useEffect } from 'react';
import { customFetch } from '../utils';

interface Friend {
  id: number;
  username: string;
  avatar: string;
  online_status: string;
  friendshipId: number;
}

export const useFriends = (
  targetUsername: string | undefined,
  userProfile: any,
  currentUser: any
) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isFriend, setIsFriend] = useState(false);
  const isCurrentUser = currentUser?.id === userProfile?.id;

  // Fetch profile user's friends
  useEffect(() => {
    if (!targetUsername) return;

    const fetchFriends = async () => {
      try {
        const response = await customFetch.get(
          `/user/${targetUsername}/friends`,
          currentUser?.authToken
            ? {
                headers: {
                  Authorization: `Bearer ${currentUser.authToken}`,
                },
              }
            : {}
        );
        setFriends(response.data);
        if (!isCurrentUser && userProfile && currentUser?.authToken) {
          const myFriendsResponse = await customFetch.get(
            `/user/${currentUser.username}/friends`,
            {
              headers: {
                Authorization: `Bearer ${currentUser.authToken}`,
              },
            }
          );
          const isFriendWithUser = myFriendsResponse.data.some(
            (friend: Friend) => friend.id === userProfile.id
          );
          setIsFriend(isFriendWithUser);
        }
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };

    fetchFriends();
  }, [targetUsername, currentUser, userProfile, isCurrentUser]);

  // Add friend functionality
  const handleAddFriend = async () => {
    if (!userProfile || !currentUser) return;

    try {
      await customFetch.post(
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

      const myFriendsResponse = await customFetch.get(
        `/user/${currentUser.username}/friends`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.authToken}`,
          },
        }
      );

      if (isCurrentUser) {
        setFriends(myFriendsResponse.data);
      }

      setIsFriend(true);
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  // Remove friend functionality
  const handleRemoveFriend = async (friendshipId: number) => {
    if (!currentUser) return;
    try {
      await customFetch.delete(`/remove_friend/${friendshipId}`, {
        headers: {
          Authorization: `Bearer ${currentUser.authToken}`,
        },
      });

      if (isCurrentUser) {
        setFriends(
          friends.filter((friend) => friend.friendshipId !== friendshipId)
        );
      }

      if (!isCurrentUser && userProfile && userProfile.id) {
        setIsFriend(false);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

    const getFriendshipId = async () => {
      if (isCurrentUser || !currentUser || !userProfile) return null;

      try {
        const response = await customFetch.get(
          `/user/${currentUser.username}/friends`,
          {
            headers: {
              Authorization: `Bearer ${currentUser.authToken}`,
            },
          }
        );

        const friendship = response.data.find(
          (f: Friend) => f.id === userProfile.id
        );
        return friendship?.friendshipId;
      } catch (error) {
        console.error('Error finding friendship ID:', error);
        return null;
      }
    };

  return {
    friends,
    isFriend,
    handleAddFriend,
    handleRemoveFriend,
    getFriendshipId
  };
};
