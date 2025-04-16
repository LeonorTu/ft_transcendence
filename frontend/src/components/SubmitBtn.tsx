import { useNavigation } from 'react-router-dom';
import styled from 'styled-components';

interface SubmitBtnProps {
  text?: string;
}

const Button = styled.button`
  padding: 1rem;
  width: 100%;
  background: #646cff;
  color: #fff;
  font-family: 'Press Start 2P', cursive;
  font-size: 14px;
  border: none;
  cursor: pointer;
  margin-top: 1rem;
  transition: background-color 0.3s;

  &:hover {
    background: #535bf2;
  }

  &:disabled {
    background: #555;
    cursor: not-allowed;
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