import axios from 'axios';

const apiUrl = 'http://localhost:8888';

export const customFetch = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

customFetch.interceptors.request.use(
  (config) => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson) as { authToken?: string };
        if (user.authToken) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${user.authToken}`,
          };
        }
      } catch {
        console.warn('Could not parse user from localStorage');
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

