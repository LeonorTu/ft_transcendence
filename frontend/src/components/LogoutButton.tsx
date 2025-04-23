import { useAuth } from '../hooks/useAuth';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { customFetch } from '../utils';

const StyledLogoutButton = styled.button`
  width: 100%;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  color: #ff4757;
  text-align: left;
  font-family: 'Press Start 2P', cursive;
  font-size: 16px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;

  &:hover {
    background-color: #fff; /* Change background to white */
    color: #000; /* Change font color to black */
  }
`;

const LogoutButton: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await customFetch.post('/user/logout');
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Error during logout');
    }
  };

  return <StyledLogoutButton onClick={handleLogout}>Logout</StyledLogoutButton>;
};

export default LogoutButton;
