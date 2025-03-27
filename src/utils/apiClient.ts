import axios from 'axios';
import { PUBLIC_API_URL } from '../constants';

export const apiClient = axios.create({
  baseURL: PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});
