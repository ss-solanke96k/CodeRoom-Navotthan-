import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/index.js';
import { registerUser, loginUser, fetchCurrentUser, logout, clearAuthError } from '../store/authSlice.js';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, token, backendStatus, loading, error } = useAppSelector((state) => state.auth);

  // Validate active session token on initialization
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser(token));
    }
  }, [token, user, dispatch]);

  const handleRegister = useCallback(
    async (userData) => {
      const result = await dispatch(registerUser(userData));
      return result.meta.requestStatus === 'fulfilled';
    },
    [dispatch]
  );

  const handleLogin = useCallback(
    async (credentials) => {
      const result = await dispatch(loginUser(credentials));
      return result.meta.requestStatus === 'fulfilled';
    },
    [dispatch]
  );

  const handleLogout = useCallback(() => {
    dispatch(logout());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  return {
    user,
    token,
    backendStatus,
    loading,
    error,
    register: handleRegister,
    login: handleLogin,
    logout: handleLogout,
    clearError: handleClearError
  };
}
