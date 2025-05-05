import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import img from '/Pixel-art-not-found.png';

const glitch = keyframes`
  0% { transform: translate(0); }
  20% { transform: translate(-5px, 5px); }
  40% { transform: translate(-5px, -5px); }
  60% { transform: translate(5px, 5px); }
  80% { transform: translate(5px, -5px); }
  100% { transform: translate(0); }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 170, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(0, 255, 170, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 255, 170, 0); }
`;

// Styled components
const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  padding: 0 20px;
`;

// const ErrorHeading = styled.h1`
//   font-size: clamp(3rem, 10vw, 8rem); /* Responsive font size */
//   font-size: 4rem;
//   margin-bottom: 6rem;
//   color: rgb(255, 255, 255);
//   font-weight: bold;
// `;

const ErrorHeading = styled.h1`
  font-family: 'Press Start 2P', cursive, sans-serif;
  font-size: clamp(2rem, 6vw, 4rem);
  color: white;
  text-shadow: 0 0 10px rgba(0, 255, 170, 0.7);
  margin: 6rem;
  position: relative;

  &::before {
    content: attr(data-text);
    position: absolute;
    left: -2px;
    text-shadow: 3px 0 #ff00ff;
    top: 0;
    color: white;
    overflow: hidden;
    clip: rect(0, 900px, 0, 0);
    animation: ${glitch} 3s infinite linear alternate-reverse;
  }

  &::after {
    content: attr(data-text);
    position: absolute;
    left: 2px;
    text-shadow: -3px 0 #00ffaa;
    top: 0;
    color: white;
    overflow: hidden;
    clip: rect(0, 900px, 0, 0);
    animation: ${glitch} 2s infinite linear alternate-reverse;
  }
`;

const ErrorContent = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
`;

const HomeButton = styled(Link)`
  background-color: rgba(0, 0, 0, 0.5);
  color: #00ffaa;
  padding: 1rem 2.5rem;
  border: 2px solid #00ffaa;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
  letter-spacing: 1px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  z-index: 1;
  animation: ${pulse} 2s infinite;

  &:hover {
    background-color: rgba(0, 255, 170, 0.2);
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: translateY(1px);
  }
`;

const Error: React.FC = () => {
  const error = useRouteError();
  console.log(error);

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorContainer>
        <ErrorContent>
          <img src={img} alt='not found' />
          <ErrorHeading>Page Not Found</ErrorHeading>
          <HomeButton to='/'>back home</HomeButton>
        </ErrorContent>
      </ErrorContainer>
    );
  }

  return (
    <ErrorContainer>
      <ErrorContent>
        <ErrorHeading>Something Went Wrong</ErrorHeading>
        <HomeButton to='/'>back home</HomeButton>
      </ErrorContent>
    </ErrorContainer>
  );
};

export default Error;
