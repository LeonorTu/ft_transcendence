import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import {
  Game,
  Home,
  Login,
  Signup,
  Tournament,
  UserProfile,
  Error,
} from './pages';
import Layout from './components/Layout';
import { action as signupAction } from './pages/Signup';
import { action as loginAction } from './pages/Login';
import { AuthContext } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

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
        path: 'login',
        element: <Login />,
        action: loginAction,
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
  const { user, login, logout, setUser } = useAuth();
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <RouterProvider router={router} />
    </AuthContext.Provider>
  );
};

export default App;
