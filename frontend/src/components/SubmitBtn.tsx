import { useNavigation } from 'react-router-dom';
import styled from 'styled-components';

interface SubmitBtnProps {
  text?: string;
}

const Button = styled.button`
  width: 100%;
  font-family: 'Press Start 2P', cursive;
  color: white;
  background: rgba(0, 0, 0, 0.6);
  border: 3px solid white;
  border-radius: 8px;
  font-size: 1.2rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  text-transform: uppercase;

  &:hover {
    color: #00ffaa;
    border-color: #00ffaa;
    box-shadow: 0 0 30px rgba(0, 255, 170, 0.6);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    animation: none;
  }
`;

const LoadingSpinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-right: 8px;
  border: 2px solid #ffffff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const SubmitBtn: React.FC<SubmitBtnProps> = ({ text }) => {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Button type='submit' disabled={isSubmitting}>
      {isSubmitting ? (
        <>
          <LoadingSpinner />
          sending...
        </>
      ) : (
        text || 'submit'
      )}
    </Button>
  );
};

export default SubmitBtn;