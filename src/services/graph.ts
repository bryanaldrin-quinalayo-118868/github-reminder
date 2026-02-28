import { msalInstance, graphScopes, chatScopes } from '@/config/msal';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

async function getAccessToken(scopes: string[] = graphScopes): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No authenticated account. Please sign in first.');
  }

  const result = await msalInstance.acquireTokenSilent({
    scopes,
    account: accounts[0],
  });

  return result.accessToken;
}

async function graphFetch<T>(endpoint: string, options?: RequestInit, scopes?: string[]): Promise<T> {
  const token = await getAccessToken(scopes);
  const res = await fetch(`${GRAPH_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph API error: ${res.status} — ${body}`);
  }

  return res.json();
}

export type Team = {
  id: string;
  displayName: string;
};

export type Channel = {
  id: string;
  displayName: string;
};

export type GroupChat = {
  id: string;
  topic: string | null;
  chatType: string;
  members: string[];
};

export async function fetchJoinedTeams(): Promise<Team[]> {
  const data = await graphFetch<{ value: Team[] }>('/me/joinedTeams');
  return data.value;
}

export async function fetchChannels(teamId: string): Promise<Channel[]> {
  const data = await graphFetch<{ value: Channel[] }>(
    `/teams/${teamId}/channels`,
  );
  return data.value;
}

export async function fetchGroupChats(): Promise<GroupChat[]> {
  const data = await graphFetch<{ value: { id: string; topic: string | null; chatType: string }[] }>(
    '/me/chats?$filter=chatType eq \'group\'&$expand=members&$top=50',
    undefined,
    chatScopes,
  );

  return data.value.map((chat) => ({
    id: chat.id,
    topic: chat.topic,
    chatType: chat.chatType,
    members: ((chat as Record<string, unknown>).members as { displayName: string }[] | undefined)?.map(
      (m) => m.displayName,
    ) ?? [],
  }));
}

type Mention = {
  id: number;
  mentionText: string;
  mentioned: {
    user: {
      id: string;
      displayName: string;
      userIdentityType: string;
    };
  };
};

export async function resolveUserId(email: string): Promise<string> {
  const data = await graphFetch<{ id: string }>(`/users/${email}`);
  return data.id;
}

async function buildMentionPayload(
  prTitle: string,
  prUrl: string,
  reviewers: { email: string; displayName: string }[],
  customMessage?: string,
) {
  const mentions: Mention[] = [];
  const mentionTags: string[] = [];

  for (let i = 0; i < reviewers.length; i++) {
    const reviewer = reviewers[i];
    let userId: string;
    try {
      userId = await resolveUserId(reviewer.email);
    } catch {
      continue;
    }

    mentions.push({
      id: i,
      mentionText: reviewer.displayName,
      mentioned: {
        user: {
          id: userId,
          displayName: reviewer.displayName,
          userIdentityType: 'aadUser',
        },
      },
    });

    mentionTags.push(`<at id="${i}">${reviewer.displayName}</at>`);
  }

  const msg = customMessage || 'please review this PR.'
  const content = mentionTags.length > 0
    ? `🔔 <strong>PR Review Needed</strong><br/><a href="${prUrl}">${prTitle}</a><br/><br/>${mentionTags.join(', ')} — ${msg}`
    : `🔔 <strong>PR Review Needed</strong><br/><a href="${prUrl}">${prTitle}</a><br/><br/>${msg}`;

  return { content, mentions };
}

export async function sendChannelMessage(
  teamId: string,
  channelId: string,
  prTitle: string,
  prUrl: string,
  reviewers: { email: string; displayName: string }[],
  customMessage?: string,
): Promise<void> {
  const { content, mentions } = await buildMentionPayload(prTitle, prUrl, reviewers, customMessage);

  await graphFetch(`/teams/${teamId}/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      body: { contentType: 'html', content },
      mentions,
    }),
  });
}

export async function sendChatMessage(
  chatId: string,
  prTitle: string,
  prUrl: string,
  reviewers: { email: string; displayName: string }[],
  customMessage?: string,
): Promise<void> {
  const { content, mentions } = await buildMentionPayload(prTitle, prUrl, reviewers, customMessage);

  await graphFetch(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      body: { contentType: 'html', content },
      mentions,
    }),
  }, chatScopes);
}
