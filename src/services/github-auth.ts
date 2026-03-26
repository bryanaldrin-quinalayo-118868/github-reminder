const TOKEN_KEY = 'gh-reminder:github-token';
const USER_KEY = 'gh-reminder:github-user';
const AUTH_VERSION_KEY = 'gh-reminder:auth-version';

// Bump this number to force all users to re-authenticate
const AUTH_VERSION = 2;

type GitHubUser = {
  login: string;
  avatar_url: string;
  name: string | null;
};

// ---------------------------------------------------------------------------
// Auth version gate — call once on app startup
// ---------------------------------------------------------------------------

export function enforceAuthVersion(): void {
  const stored = localStorage.getItem(AUTH_VERSION_KEY);
  if (stored !== String(AUTH_VERSION)) {
    // Clear all app-owned keys
    const keysToRemove = Object.keys(localStorage).filter((k) => k.startsWith('gh-reminder:'));
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    localStorage.setItem(AUTH_VERSION_KEY, String(AUTH_VERSION));
  }
}

// ---------------------------------------------------------------------------
// Token persistence
// ---------------------------------------------------------------------------

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): GitHubUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function storeUser(user: GitHubUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ---------------------------------------------------------------------------
// Fetch authenticated user
// ---------------------------------------------------------------------------

export async function fetchAuthenticatedUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user: ${res.status}`);
  }

  const data: GitHubUser = await res.json();
  storeUser(data);
  return data;
}
