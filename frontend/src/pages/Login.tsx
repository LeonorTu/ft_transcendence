import { FormInput, SubmitBtn } from '../components';
import { Form, Link } from 'react-router-dom';
import styled from 'styled-components';

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

const Login: React.FC = () => {
  return (
    <Container>
      <FormContainer method='post'>
        <Title>Login</Title>
        <FormInput type='text' label='username' name='identifier' />
        <FormInput type='password' label='password' name='password' />
        <ButtonContainer>
          <SubmitBtn text='login' />
        </ButtonContainer>
        <LinkContainer>
          Don't have an account? <StyledLink to='/signup'>signup</StyledLink>
        </LinkContainer>
      </FormContainer>
    </Container>
  );
};

export default Login;
