import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import {
  Game,
  Home,
  Login,
  Signup,
  Tournament,
  UserProfile,
  Error,
  Verify2FA,
  GameLobby,
} from './pages';
import Layout from './components/Layout';
import { action as signupAction } from './pages/Signup';
import { action as loginAction } from './pages/Login';
import { action as verify2FAAction } from './pages/Verify2FA';
import { AuthProvider } from './context/AuthContext';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <Error />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'game',
        element: <Game />,
      },
      {
        path: 'lobby',
        element: <GameLobby />,
      },
      {
        path: 'login',
        children: [
          {
            index: true,
            element: <Login />,
            action: loginAction,
          },
          {
            path: 'verify-2fa',
            element: <Verify2FA />,
            action: verify2FAAction,
          },
        ],
      },
      {
        path: 'signup',
        element: <Signup />,
        action: signupAction,
      },
      {
        path: 'tournament',
        element: <Tournament />,
      },
      {
        path: 'profile',
        element: <UserProfile />,
      },
    ],
  },
]);

const App = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;
