import { useNavigate } from 'react-router-dom';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Add global styles to ensure no scrolling
const GlobalStyle = createGlobalStyle`
  html, body, #root {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    background-color: #000;
  }
`;

// Animation keyframes
const pulse = keyframes`
  0% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0.8; transform: scale(1); }
`;

const float = keyframes`
  0% { transform: translateY(-50%) translateY(-10px); }
  50% { transform: translateY(-50%) translateY(10px); }
  100% { transform: translateY(-50%) translateY(-10px); }
`;

const ballMove = keyframes`
  0% { left: 12%; }
  45% { left: 86%; }
  50% { left: 86%; }
  95% { left: 12%; }
  100% { left: 12%; }
`;

const blink = keyframes`
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
`;

const gridEffect = keyframes`
  0% { background-position: 0px 0px; }
  100% { background-position: 50px 50px; }
`;

// Styled Components
const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  position: relative;
  background-color: #000;
  background-image: linear-gradient(rgba(20, 20, 20, 0.7) 1px, transparent 1px),
    linear-gradient(90deg, rgba(20, 20, 20, 0.7) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: ${gridEffect} 20s linear infinite;
  overflow: hidden;
`;

const LeftPaddle = styled.div`
  position: absolute;
  left: 10%;
  top: 50%;
  transform: translateY(-50%);
  width: 22.5px;
  height: 150px;
  background-color: white;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
  animation: ${float} 4s ease-in-out infinite;
`;

const RightPaddle = styled.div`
  position: absolute;
  right: 10%;
  top: 50%;
  transform: translateY(-50%);
  width: 22.5px;
  height: 150px;
  background-color: white;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
  animation: ${float} 4s ease-in-out infinite reverse;
`;

const Ball = styled.div`
  position: absolute;
  width: 30px;
  height: 30px;
  background-color: white;
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.9);
  animation: ${ballMove} 6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
`;

const Title = styled.h1`
  font-family: 'Press Start 2P', cursive;
  color: white;
  text-align: center;
  margin-bottom: 3rem;
  font-size: 8rem;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
  letter-spacing: -0.3rem;

  @media (max-width: 768px) {
    font-size: 5rem;
  }
`;

const Tagline = styled.p`
  font-family: 'Press Start 2P', cursive;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 3rem;
  letter-spacing: 0.1rem;
`;

const PlayButton = styled.button`
  font-family: 'Press Start 2P', cursive;
  color: white;
  background: rgba(0, 0, 0, 0.6);
  border: 3px solid white;
  border-radius: 8px;
  font-size: 2.5rem;
  padding: 1.2rem 4rem;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  margin-top: 2rem;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  animation: ${pulse} 2s infinite ease-in-out;
  z-index: 10;

  &:hover {
    color: #00ffaa;
    border-color: #00ffaa;
    transform: scale(1.1);
    box-shadow: 0 0 30px rgba(0, 255, 170, 0.6);
    animation: none;
  }
`;

const Prompt = styled.div`
  position: absolute;
  bottom: 5%;
  font-family: 'Press Start 2P', cursive;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  animation: ${blink} 2s infinite;
`;

const FeaturesContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
  margin-bottom: 2rem;
`;

const FeatureItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.8rem;

  & > svg {
    margin-bottom: 0.5rem;
  }
`;

const DottedLine = styled.div`
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 6px;
  background: repeating-linear-gradient(
    to bottom,
    white,
    white 20px,
    transparent 20px,
    transparent 40px
  );
  opacity: 0.5;
  transform: translateX(-50%);
`;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hovered, setHovered] = useState(false);

  const handlePlay = () => {
    if (user) {
      // If logged in, go to game menu
      navigate('/game');
    } else {
      // If not logged in, go to login
      navigate('/login');
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Optional: Add sound effect for hover
    if (hovered) {
      // Play hover sound
    }
  }, [hovered]);

  return (
    <>
      <GlobalStyle />
      <HomeContainer>
        <DottedLine />
        <LeftPaddle />
        <RightPaddle />
        <Ball />

        <Title>PONG</Title>
        <Tagline>The Classic Arcade Game Reimagined</Tagline>

        <FeaturesContainer>
          <FeatureItem>
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M17 3H7C4.79086 3 3 4.79086 3 7V17C3 19.2091 4.79086 21 7 21H17C19.2091 21 21 19.2091 21 17V7C21 4.79086 19.2091 3 17 3Z'
                stroke='white'
                strokeWidth='2'
              />
              <path d='M8 12H16' stroke='white' strokeWidth='2' />
              <path d='M12 8V16' stroke='white' strokeWidth='2' />
            </svg>
            Play Online
          </FeatureItem>
          <FeatureItem>
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21'
                stroke='white'
                strokeWidth='2'
              />
              <path
                d='M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z'
                stroke='white'
                strokeWidth='2'
              />
              <path
                d='M23 21V19C22.9986 17.1771 21.765 15.5857 20 15.13'
                stroke='white'
                strokeWidth='2'
              />
              <path
                d='M16 3.13C17.7699 3.58317 19.0078 5.17799 19.0078 7.005C19.0078 8.83201 17.7699 10.4268 16 10.88'
                stroke='white'
                strokeWidth='2'
              />
            </svg>
            Multiplayer
          </FeatureItem>
          <FeatureItem>
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M12 15C15.866 15 19 11.866 19 8C19 4.13401 15.866 1 12 1C8.13401 1 5 4.13401 5 8C5 11.866 8.13401 15 12 15Z'
                stroke='white'
                strokeWidth='2'
              />
              <path
                d='M8.21 13.89L7 23L12 20L17 23L15.79 13.88'
                stroke='white'
                strokeWidth='2'
              />
            </svg>
            Tournaments
          </FeatureItem>
        </FeaturesContainer>

        <PlayButton
          onClick={handlePlay}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          PLAY
        </PlayButton>

        <Prompt>Press PLAY to begin</Prompt>
      </HomeContainer>
    </>
  );
};

export default Home;
