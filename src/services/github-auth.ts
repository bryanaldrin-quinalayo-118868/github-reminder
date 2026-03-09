const TOKEN_KEY = 'gh-reminder:github-token';
const USER_KEY = 'gh-reminder:github-user';

type GitHubUser = {
  login: string;
  avatar_url: string;
  name: string | null;
};

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
