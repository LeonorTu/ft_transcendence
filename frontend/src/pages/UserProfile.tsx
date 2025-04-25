import UserCard from './UserCard';

interface UserProfileProps {
  id: number;
  username: string;
  avatar: string;
  online_status: string;
};

const UserProfile: React.FC<UserProfileProps> = ({
  id,
  username,
  avatar,
  online_status,
}) => {
  return (
    <div>
      <UserCard
        id={id}
        username={username}
        avatar={avatar}
        online_status={online_status}
      ></UserCard>
    </div>
  );
};

export default UserProfile;
