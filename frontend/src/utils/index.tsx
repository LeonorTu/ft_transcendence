import axios from 'axios';

const apiUrl = 'http://localhost:8888';

export const customFetch = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});
