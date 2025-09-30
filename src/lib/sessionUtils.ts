/**
 * Get the current admin session token
 */
export const getSessionToken = (): string | null => {
  const token = sessionStorage.getItem('admin_session_token');
  const expiresAt = sessionStorage.getItem('admin_session_expires');
  
  if (!token || !expiresAt) {
    return null;
  }

  // Check if token has expired
  const expiryDate = new Date(expiresAt);
  if (expiryDate <= new Date()) {
    // Token expired, clear it
    sessionStorage.removeItem('admin_session_token');
    sessionStorage.removeItem('admin_session_expires');
    return null;
  }

  return token;
};

/**
 * Clear the current session
 */
export const clearSession = (): void => {
  sessionStorage.removeItem('admin_session_token');
  sessionStorage.removeItem('admin_session_expires');
};

/**
 * Check if user has a valid session
 */
export const hasValidSession = (): boolean => {
  return getSessionToken() !== null;
};
