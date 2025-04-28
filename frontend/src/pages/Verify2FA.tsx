import { useEffect, useRef } from 'react';
import {
  Form,
  useActionData,
  useLocation,
  useNavigate,
  ActionFunctionArgs,
} from 'react-router-dom';
import styled from 'styled-components';
import { FormInput, SubmitBtn } from '../components';
import { customFetch } from '../utils';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

// Styled components (reuse from Login/Signup)
const Container = styled.section`
  height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const FormContainer = styled(Form)`
  width: 24rem;
  padding: 2rem;
  background-color: #1a1a1a;
  border: 2px solid #333;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Title = styled.h4`
  text-align: center;
  font-size: 1.875rem;
  font-weight: bold;
  font-family: 'Press Start 2P', cursive;
  color: #fff;
  margin-bottom: 1rem;
`;

const ButtonContainer = styled.div`
  margin-top: 1rem;
`;

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const code = formData.get('code') as string;
  const username = formData.get('username') as string;

  try {
    const response = await customFetch.post('/verify_2fa_code', {
      code,
      username,
    });
    if (response.data.token) {
      toast.success('Verification successful');
      return { token: response.data.token };
    } else {
      toast.error('Invalid verification code');
      return null;
    }
  } catch (error: any) {
    let errorMessage = 'Verification failed';
    if (error.response?.data?.error) errorMessage = error.response.data.error;
    toast.error(errorMessage);
    return null;
  }
};

const Verify2FA: React.FC = () => {
  const actionData = useActionData();
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasNavigated = useRef(false);
  const params = new URLSearchParams(location.search);
  const username = location.state?.username || params.get('username');

  useEffect(() => {
    if (!username) {
      navigate('/login');
      return;
    }

    if (actionData?.token && !hasNavigated.current) {
      const user = {
        id: "1",
        username: username,
        authToken: actionData.token,
      };
      console.log(user.username);

      login(user);
      hasNavigated.current = true;
      navigate('/game');
    }
  }, [username, actionData, login, navigate]);

  if (!username) return null;
  return (
    <Container>
      <FormContainer method='post'>
        <Title>Verification</Title>
        <FormInput type='text' label='code' name='code' required />
        {/* Hidden input to pass username to action */}
        <input type='hidden' name='username' value={username} />

        <ButtonContainer>
          <SubmitBtn text='Verify' />
        </ButtonContainer>
      </FormContainer>
    </Container>
  );
};

export default Verify2FA;
