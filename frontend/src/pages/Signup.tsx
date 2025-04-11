import { FormInput, SubmitBtn } from '../components';
import { Form, Link } from 'react-router-dom';
import styled from 'styled-components';

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

const Signup: React.FC = () => {
  return (
    <Container>
      <FormContainer method='POST'>
        <Title>Signup</Title>
        <FormInput type='text' label='username' name='username' />
        <FormInput type='password' label='password' name='password' />
        <FormInput
          type='password'
          label='confirm password'
          name='confirmPassword'
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
