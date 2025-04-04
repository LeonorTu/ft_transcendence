import { useState } from 'react'
import { ThemeProvider } from 'styled-components'
import { Link, Outlet } from 'react-router-dom'
import styled from 'styled-components'

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
`

const Drawer = styled.aside<{ $isOpen: boolean }>`
  width: 250px;
  background-color: #1a1a1a;
  border-right: 1px solid #333;
  transition: transform 0.3s ease;
  transform: ${({ $isOpen }) =>
    $isOpen ? 'translateX(0)' : 'translateX(-100%)'};
  height: 100vh;
  position: fixed;
  z-index: 5;
  display: flex;
  flex-direction: column;
`

const NavContainer = styled.div`
  flex: 1;
  overflow-y: auto;
`

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 60px 0 0;
`

const NavItem = styled.li`
  padding: 0;
`

const NavLink = styled(Link)`
  padding: 1rem 1.5rem;
  display: block;
  color: #fff;
  text-decoration: none;
  font-family: 'Courier New', Courier, monospace; /* Monospace font */
  font-size: 18px; /* Adjust size as needed */
  letter-spacing: 2px; /* Add spacing between letters for blocky look */
  text-transform: uppercase; /* Make text uppercase */
  transition: background-color 0.2s;

  &:hover {
    background-color: #2a2a2a;
  }
`
const DrawerFooter = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 1rem 0;
  border-top: 1px solid #333;
`

const LogoutButton = styled.button`
  width: 100%;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  color: #ff4757;
  text-align: left;
  font-family: 'Courier New', Courier, monospace;
  font-size: 18px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;

  &:hover {
    background-color: #2a2a2a;
  }
`
const Content = styled.main`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  transition: margin-left 0.3s ease;
  width: 100%;
`

const ToggleButton = styled.button`
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 10;
  background: #646cff;
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
`

const Layout = () => {
  const [isOpen, setIsOpen] = useState(true)

  const handleLogout = () => {
    // Add logout later
    console.log('Logging out...')
  }

  return (
    <ThemeProvider theme={{ isOpen }}>
      <LayoutContainer>
        <ToggleButton onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '←' : '→'}
        </ToggleButton>

        <Drawer $isOpen={isOpen}>
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
            <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
          </DrawerFooter>
        </Drawer>

        <Content>
          <Outlet />
        </Content>
      </LayoutContainer>
    </ThemeProvider>
  )
}

export default Layout
