import { getStoredToken } from '@/services/github-auth';

const STORAGE_KEY = 'gh-reminder:user-mappings';
const GITHUB_API = 'https://api.github.com';
const OWNER = 'bryanaldrin-quinalayo-118868';
const REPO = 'github-reminder';
const FILE_PATH = 'user-mappings.json';

// Record of { [githubUsername]: teamsEmail }
type MappingsRecord = Record<string, string>;

function getToken(): string | null {
  return getStoredToken();
}

function loadCache(): MappingsRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(mappings: MappingsRecord): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
}

// --- Sync reads (from local cache) ---

export function getTeamsEmail(githubUsername: string): string | null {
  const mappings = loadCache();
  const key = Object.keys(mappings).find(
    (k) => k.toLowerCase() === githubUsername.toLowerCase(),
  );
  return key ? mappings[key] || null : null;
}

export function getAllMappings(): MappingsRecord {
  return loadCache();
}

// --- Async GitHub operations ---

export async function fetchMappings(): Promise<MappingsRecord> {
  const token = getToken();
  if (!token) return loadCache();

  const res = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    return loadCache();
  }

  const data = await res.json();
  const content = atob(data.content);
  const remote: MappingsRecord = JSON.parse(content);

  saveCache(remote);
  return remote;
}

export async function saveMappings(mappings: MappingsRecord): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('No GitHub token found. Please sign in.');

  // Get current file SHA (required for updates)
  const getRes = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!getRes.ok) {
    throw new Error('Failed to fetch current mappings file from GitHub');
  }

  const current = await getRes.json();
  const encoded = btoa(JSON.stringify(mappings, null, 2));

  const putRes = await fetch(
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'chore: update user email mappings',
        content: encoded,
        sha: current.sha,
      }),
    },
  );

  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`Failed to save mappings: ${putRes.status} — ${body}`);
  }

  saveCache(mappings);
}
