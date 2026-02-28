const STORAGE_KEY = 'gh-reminder:teams-settings';

export type SendMode = 'channel' | 'chat';

type TeamsSettings = {
  sendMode: SendMode;
  teamId: string | null;
  teamName: string | null;
  channelId: string | null;
  channelName: string | null;
  chatId: string | null;
  chatName: string | null;
};

const defaults: TeamsSettings = {
  sendMode: 'channel',
  teamId: null,
  teamName: null,
  channelId: null,
  channelName: null,
  chatId: null,
  chatName: null,
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
