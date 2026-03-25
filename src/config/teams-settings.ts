const STORAGE_KEY = 'gh-reminder:teams-settings';
const WAS_CONNECTED_KEY = 'gh-reminder:teams-was-connected';

type TeamsSettings = {
  teamId: string | null;
  teamName: string | null;
  channelId: string | null;
  channelName: string | null;
};

const defaults: TeamsSettings = {
  teamId: null,
  teamName: null,
  channelId: null,
  channelName: null,
};

export function getTeamsSettings(): TeamsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveTeamsSettings(settings: Partial<TeamsSettings>): void {
  const current = getTeamsSettings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...settings }));
}

export function markTeamsConnected(): void {
  localStorage.setItem(WAS_CONNECTED_KEY, 'true');
}

export function wasTeamsEverConnected(): boolean {
  return localStorage.getItem(WAS_CONNECTED_KEY) === 'true';
}
