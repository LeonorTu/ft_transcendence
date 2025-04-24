import { useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { Link, Outlet } from 'react-router-dom';
import styled from 'styled-components';
import LogoutButton from './LogoutButton';
import { useAuth } from '../context/AuthContext';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
`;

const Drawer = styled.aside<{ $isOpen: boolean }>`
  width: 250px;
  background-color: #1a1a1a;
  border-right: 1px solid #333;
  transition: transform 0.3s ease;
  transform: ${({ $isOpen }) =>
    $isOpen ? 'translateX(0)' : 'translateX(-100%)'};
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
`;

const NavContainer = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 60px 0 0;
`;

const NavItem = styled.li`
  padding: 0;
  margin-bottom: 1rem;
`;

const DrawerTitle = styled.div`
  font-family: 'Press Start 2P', cursive; /* Pixel font */
  font-size: 42px; /* Large font size for the title */
  color: #fff; /* White text color */
  text-align: center; /* Center the title */
  margin-top: 2rem;
`;

const NavLink = styled(Link)`
  padding: 1rem 1.5rem;
  display: block;
  color: #fff;
  text-decoration: none;
  font-family: 'Press Start 2P', cursive; /* Pixel font */
  font-size: 16px;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: background-color 0.2s;

  &:hover {
    background-color: #fff; /* Change background to white */
    color: #000; /* Change font color to black */
  }
`;

const DrawerFooter = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 1rem 0;
  border-top: 1px solid #333;
`;

const Content = styled.main`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  transition: margin-left 0.3s ease;
  width: 100%;
`;

const ToggleButton = styled.button`
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 10;
  background: #69696b;
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
`;

const Layout: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { user } = useAuth();

  return (
    <ThemeProvider theme={{ isOpen }}>
      <LayoutContainer>
        {user && ( // Show Drawer only if the user is logged in
          <>
            <ToggleButton onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? '←' : '→'}
            </ToggleButton>

            <Drawer $isOpen={isOpen}>
              <DrawerTitle>Pong</DrawerTitle>
              <NavContainer>
                <NavList>
                  <NavItem>
                    <NavLink to='/'>Home</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink to='/game'>Game</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink to='/tournament'>Tournament</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink to='/profile'>Profile</NavLink>
                  </NavItem>
                </NavList>
              </NavContainer>

              <DrawerFooter>
                <LogoutButton />
              </DrawerFooter>
            </Drawer>
          </>
        )}

        <Content>
          <Outlet />
        </Content>
      </LayoutContainer>
    </ThemeProvider>
  );
};

export default Layout;
