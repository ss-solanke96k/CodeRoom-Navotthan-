import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import authReducer from './authSlice.js';
import roomReducer from './roomSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    room: roomReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
