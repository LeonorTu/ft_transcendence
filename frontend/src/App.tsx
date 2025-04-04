import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Game, Home, Login, Signup, Tournament, UserProfile } from './pages'
import Layout from './components/Layout'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
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
])

const App = () => {
  return <RouterProvider router={router} />
}

export default App
