import { FormInput, SubmitBtn } from '../components';
import { ActionFunctionArgs, Form, Link, redirect } from 'react-router-dom';
import styled from 'styled-components';
import { customFetch } from '../utils';
import { toast } from 'react-toastify';
import { AxiosError } from 'axios';

// Reuse the same styled components from the Login page
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

const LinkContainer = styled.p`
  text-align: center;
  font-family: 'Press Start 2P', cursive;
  font-size: 12px;
  color: #fff;
  margin-top: 1rem;
`;

const StyledLink = styled(Link)`
  margin-left: 0.5rem;
  color: #646cff;
  text-decoration: none;
  text-transform: capitalize;
  transition: color 0.3s;

  &:hover {
    color: #535bf2;
    text-decoration: underline;
  }
`;

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (password !== confirmPassword) {
    console.log('Passwords do not match');

    toast.error('Passwords do not match');
    return null;
  }

  try {
    const response = await customFetch.post('/user/register', {
      username,
      password,
    });
    toast.success('account created successfully');
    return redirect('/login');
  } catch (error: unknown) {
    // Type the error properly
    let errorMessage = 'please double check your credentials';

    // Check if it's an axios error and has the expected structure
    if (error instanceof AxiosError && error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    toast.error(errorMessage);
    return null;
  }
};

const Signup: React.FC = () => {
  return (
    <Container>
      <FormContainer method='POST'>
        <Title>Signup</Title>
        <FormInput type='text' label='username' name='username' required />
        <FormInput type='password' label='password' name='password' required />
        <FormInput
          type='password'
          label='confirm password'
          name='confirmPassword'
          required
        />
        <ButtonContainer>
          <SubmitBtn text='Signup' />
        </ButtonContainer>
        <LinkContainer>
          Already have an account?
          <StyledLink to='/login'>login</StyledLink>
        </LinkContainer>
      </FormContainer>
    </Container>
  );
};

export default Signup;
