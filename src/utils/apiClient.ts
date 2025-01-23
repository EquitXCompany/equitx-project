import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'https://api.mercurydata.app',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.PUBLIC_MERCURY_API_TOKEN}`
  }
});
