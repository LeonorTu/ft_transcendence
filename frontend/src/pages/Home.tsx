import { Link } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { useEffect, useState } from 'react';

// Add global styles to ensure no scrolling
const GlobalStyle = createGlobalStyle`
  html, body, #root {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden; /* Prevent scrolling */
  }
`;

const HomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  position: relative;
`;

// Left paddle
const LeftPaddle = styled.div`
  position: absolute;
  left: 10%;
  top: 50%;
  transform: translateY(-50%);
  width: 22.5px;
  height: 150px;
  background-color: white;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
`;

// Right paddle
const RightPaddle = styled.div`
  position: absolute;
  right: 10%;
  top: 50%;
  transform: translateY(-50%);
  width: 22.5px;
  height: 150px;
  background-color: white;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
`;

const Title = styled.h1`
  font-family: 'Press Start 2P', cursive;
  color: white;
  text-align: center;
  margin-bottom: 5rem;
  font-size: 10rem;
`;

const StartText = styled.h2`
  font-family: 'Press Start 2P', cursive;
  color: #646cff;
  text-align: center;
  margin-bottom: 3rem;
  font-size: 3rem;
`;

const MenuContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 300px;
`;

const MenuItem = styled(Link)`
  font-family: 'Press Start 2P', cursive;
  color: white;
  text-decoration: none;
  font-size: 1.5rem;
  padding: 0.5rem;
  display: block;
  text-align: center;
  transition: all 0.3s;
  position: relative;

  &:hover {
    color: #646cff;
  }

  &::before {
    content: '▶';
    position: absolute;
    left: -1.5rem;
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover::before {
    opacity: 1;
  }
`;

const Home = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if the user is logged in by looking for a token in localStorage
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <>
      <GlobalStyle />
      <HomeContainer>
        <LeftPaddle />
        <RightPaddle />
        <Title>Welcome to Pong!</Title>
        <StartText>Start</StartText>
        <MenuContainer>
          <MenuItem to='/game'>local game</MenuItem>
          <MenuItem to={isLoggedIn ? '/game' : '/login'}>remote game</MenuItem>
        </MenuContainer>
      </HomeContainer>
    </>
  );
};

export default Home;
