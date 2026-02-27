const STORAGE_KEY = 'gh-reminder:user-mappings';

// Record of { [githubUsername]: teamsEmail }
type MappingsRecord = Record<string, string>;

function load(): MappingsRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(mappings: MappingsRecord): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
}

export function getTeamsEmail(githubUsername: string): string | null {
  const mappings = load();
  const key = Object.keys(mappings).find(
    (k) => k.toLowerCase() === githubUsername.toLowerCase(),
  );
  return key ? mappings[key] || null : null;
}

export function getAllMappings(): MappingsRecord {
  return load();
}

export function setMapping(githubUsername: string, teamsEmail: string): void {
  const mappings = load();
  mappings[githubUsername] = teamsEmail;
  save(mappings);
}

export function setMappings(updates: MappingsRecord): void {
  const mappings = load();
  for (const [username, email] of Object.entries(updates)) {
    mappings[username] = email;
  }
  save(mappings);
}
