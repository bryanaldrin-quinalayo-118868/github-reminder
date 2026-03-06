const STORAGE_KEY = 'gh-reminder:github-username'

export function getGitHubUsername(): string | null {
  return localStorage.getItem(STORAGE_KEY) || null
}

export function setGitHubUsername(username: string | null): void {
  if (username) {
    localStorage.setItem(STORAGE_KEY, username)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}
