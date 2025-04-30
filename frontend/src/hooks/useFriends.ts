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
  const [myFriends, setMyFriends] = useState<Friend[]>([]);
  const [isFriend, setIsFriend] = useState(false);

  // Fetch profile user's friends
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

  // Fetch current user's friends
  useEffect(() => {
    if (!currentUser?.username || !userProfile) return;

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
        const isFriendWithUser = response.data.some(
          (friend: Friend) => friend.id === userProfile.id
        );
        setIsFriend(isFriendWithUser);
      } catch (error) {
        console.error('Error fetching my friends:', error);
      }
    };

    fetchMyFriends();
  }, [currentUser, userProfile]);

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

      // Refetch friends to update the list
      const friendsResponse = await customFetch.get(
        `/user/${targetUsername}/friends`
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
      await customFetch.delete(`/remove_friend/${friendshipId}`, {
        headers: {
          Authorization: `Bearer ${currentUser.authToken}`,
        },
      });

      // Update the friends list
      setMyFriends(
        myFriends.filter((friend) => friend.friendshipId !== friendshipId)
      );

      if (userProfile && userProfile.id) {
        setIsFriend(false);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  return {
    friends,
    myFriends,
    isFriend,
    handleAddFriend,
    handleRemoveFriend,
  };
};
