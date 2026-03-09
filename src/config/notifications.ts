const STORAGE_KEY = 'gh-reminder:notification-settings';

export type NotificationSettings = {
  enabled: boolean;
  time: string; // HH:mm format, PHT (UTC+8)
  myPrs: boolean;
  reviewRequested: boolean;
};

const DEFAULTS: NotificationSettings = {
  enabled: false,
  time: '13:00',
  myPrs: true,
  reviewRequested: true,
};

export function getNotificationSettings(): NotificationSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
