import { useEffect, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import LogoutButton from './LogoutButton';
import { useAuth } from '../context/AuthContext';

const IMMERSIVE_PAGES = ['/', '/login', '/signup'];

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
  font-family: 'Press Start 2P', cursive;
  font-size: 42px;
  color: #fff;
  text-align: center;
  margin-top: 2rem;
`;

const NavLink = styled(Link)`
  padding: 1rem 1.5rem;
  display: block;
  color: #fff;
  text-decoration: none;
  font-family: 'Press Start 2P', cursive;
  font-size: 16px;
  letter-spacing: 2px;
  text-transform: uppercase;
  transition: all 0.2s;

  &:hover {
    background-color: #222;
    color: #00ffaa;
    transform: translateX(5px);
  }
`;

const DrawerFooter = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 1rem 0;
  border-top: 1px solid #333;
`;

// Modified Content component with conditional padding/margin
const Content = styled.main<{ $isImmersive: boolean; $drawerOpen: boolean }>`
  flex: 1;
  padding: ${({ $isImmersive }) => ($isImmersive ? '0' : '1rem')};
  margin-left: ${({ $drawerOpen, $isImmersive }) =>
    !$isImmersive && $drawerOpen ? '250px' : '0'};
  transition: margin-left 0.3s ease;
  overflow-x: hidden;
  width: 100%;
`;

// Improved toggle button that's only visible on non-immersive pages
const ToggleButton = styled.button<{ $isImmersive: boolean }>`
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 10;
  background: ${({ $isImmersive }) =>
    $isImmersive ? 'rgba(0, 0, 0, 0.5)' : '#1a1a1a'};
  border: ${({ $isImmersive }) =>
    $isImmersive ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'};
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
  opacity: ${({ $isImmersive }) => ($isImmersive ? '0.7' : '1')};
  transition: all 0.3s;

  &:hover {
    background: ${({ $isImmersive }) =>
      $isImmersive ? 'rgba(0, 0, 0, 0.7)' : '#333'};
    opacity: 1;
  }
`;

const Layout: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Check if current path is an immersive page
  const isImmersivePage = IMMERSIVE_PAGES.includes(location.pathname);

  // Auto-close drawer on immersive pages
  useEffect(() => {
    if (isImmersivePage) {
      setIsOpen(false);
    }
  }, [location.pathname, isImmersivePage]);
  return (
    <ThemeProvider theme={{ isOpen }}>
      <LayoutContainer>
        {user && ( // Show Drawer only if the user is logged in
          <>
            <ToggleButton
              onClick={() => setIsOpen(!isOpen)}
              $isImmersive={isImmersivePage}
              style={{ display: isImmersivePage && !isOpen ? 'none' : 'block' }}
            >
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
                    <NavLink to='/lobby'>Game Lobby</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink to='/tournament'>Tournament</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink to='/profile'>My Profile</NavLink>
                  </NavItem>
                </NavList>
              </NavContainer>

              <DrawerFooter>
                <LogoutButton />
              </DrawerFooter>
            </Drawer>
          </>
        )}

        <Content
          $isImmersive={isImmersivePage}
          $drawerOpen={isOpen && user !== null}
        >
          <Outlet />
        </Content>
      </LayoutContainer>
    </ThemeProvider>
  );
};

export default Layout;
