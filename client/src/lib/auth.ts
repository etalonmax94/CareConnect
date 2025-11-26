const AUTH_TOKEN_KEY = 'empowerlink_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (e) {
    console.error('Failed to save auth token:', e);
  }
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (e) {
    console.error('Failed to remove auth token:', e);
  }
}

export function extractAndStoreTokenFromUrl(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    setAuthToken(token);
    
    urlParams.delete('token');
    const newSearch = urlParams.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
    window.history.replaceState({}, '', newUrl);
    
    return true;
  }
  
  return false;
}
