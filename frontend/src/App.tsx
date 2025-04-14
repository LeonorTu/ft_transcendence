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
  return <RouterProvider router={router} />;
};

export default App;
