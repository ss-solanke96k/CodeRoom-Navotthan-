import axios from 'axios';
import { store } from '../store/index.js';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically inject Authorization Bearer token into outgoing requests if user is logged in
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const apiService = {
  async createRoom(roomName, hostUsername) {
    const response = await api.post('/api/rooms', { roomName, hostUsername });
    return response.data;
  },

  async verifyRoom(roomCode) {
    const response = await api.get(`/api/rooms/${roomCode}`);
    return response.data;
  }
};

export default api;
