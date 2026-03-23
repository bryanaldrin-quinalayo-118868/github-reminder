import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalInstance, graphScopes } from '@/config/msal';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

async function getAccessToken(scopes: string[] = graphScopes): Promise<string> {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No authenticated account. Please sign in first.');
  }

  try {
    const result = await msalInstance.acquireTokenSilent({
      scopes,
      account: accounts[0],
    });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect({ scopes });
      throw new Error('Redirecting for consent...');
    }
    throw error;
  }
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

type ResolvedReviewer = {
  userId: string;
  displayName: string;
};

export type PrCardInfo = {
  repoName: string;
  prNumber: number;
  authorLogin: string;
  adoWorkItems: { id: number; url: string; state: string; sprint: string }[];
  totalReviewers: number;
  mergeableState: string;
};

async function resolveReviewers(
  reviewers: { email: string; displayName: string }[],
): Promise<{ mentions: Mention[]; resolved: ResolvedReviewer[] }> {
  const mentions: Mention[] = [];
  const resolved: ResolvedReviewer[] = [];

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

    resolved.push({ userId, displayName: reviewer.displayName });
  }

  return { mentions, resolved };
}

function buildMentionBody(mentions: Mention[]): string {
  const mentionTags = mentions.map(
    (m) => `<at id="${m.id}">${m.mentionText}</at>`,
  );
  const mentionList = mentionTags.length > 0 ? `${mentionTags.join(', ')}<br/>` : '';
  return `<span style="font-size:18px">🔔 <strong>PR Review Needed</strong></span><br/>${mentionList}`;
}

type HostedContent = {
  '@microsoft.graph.temporaryId': string;
  contentBytes: string;
  contentType: string;
};

function extractBase64Images(html: string): { cleanedHtml: string; hostedContents: HostedContent[] } {
  const hostedContents: HostedContent[] = [];
  let idx = 0;

  const cleanedHtml = html.replace(
    /<img[^>]+src="(data:([^;]+);base64,([^"]*))"/gi,
    (_match, _full: string, mime: string, base64: string) => {
      const id = `hostedImage${idx++}`;
      hostedContents.push({
        '@microsoft.graph.temporaryId': id,
        contentBytes: base64,
        contentType: mime,
      });
      return `<img src="../hostedContents/${id}/$value"`;
    },
  );

  return { cleanedHtml, hostedContents };
}

function htmlToMarkdown(html: string): string {
  let md = html;
  // strip all images — they are handled as separate card Image elements
  md = md.replace(/<img[^>]*\/?>/gi, '');
  // lists — must convert before stripping block tags
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner: string) => {
    let idx = 0;
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_: string, li: string) => {
      idx++;
      return `${idx}. ${li.trim()}\n`;
    });
  });
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner: string) =>
    inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_: string, li: string) => `- ${li.trim()}\n`),
  );
  // links
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  // inline formatting
  md = md.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '_$2_');
  md = md.replace(/<(s|del|strike)>([\s\S]*?)<\/\1>/gi, '~~$2~~');
  // unwrap spans (font-size etc.) — keep inner text, drop the tag
  md = md.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  // block breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  // strip remaining tags
  md = md.replace(/<[^>]+>/g, '');
  // collapse excess whitespace but preserve intentional newlines
  md = md.replace(/\n{3,}/g, '\n\n');
  return md.trim();
}

function mergeStatePill(state: string): { label: string; dot: string } {
  const map: Record<string, { label: string; dot: string }> = {
    clean:   { label: 'Ready to merge', dot: '🟢' },
    blocked: { label: 'Blocked',        dot: '🔴' },
    behind:  { label: 'Behind base',    dot: '🟡' },
    dirty:   { label: 'Conflicts',      dot: '🔴' },
    unstable:{ label: 'Unstable',       dot: '🟡' },
    draft:   { label: 'Draft',          dot: '⚪' },
    unknown: { label: 'Unknown',        dot: '⚪' },
  };
  return map[state] ?? { label: state, dot: '⚪' };
}

function buildAdaptiveCard(
  prTitle: string,
  prUrl: string,
  resolved: ResolvedReviewer[],
  customMessage: string,
  hostedContents: HostedContent[],
  prInfo?: PrCardInfo,
) {
  const cardMessage = htmlToMarkdown(customMessage);

  const reviewerText = resolved
    .map((r) => r.displayName)
    .join(', ');

  const imageElements = hostedContents.map((hc) => ({
    type: 'Image',
    url: `../hostedContents/${hc['@microsoft.graph.temporaryId']}/$value`,
    size: 'Auto',
    spacing: 'Small',
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any[] = [
    {
      type: 'ColumnSet',
      columns: [
        {
          type: 'Column',
          width: 'auto',
          items: [
            { type: 'TextBlock', text: '🔀', size: 'Medium' },
          ],
          verticalContentAlignment: 'Center',
        },
        {
          type: 'Column',
          width: 'stretch',
          items: [
            {
              type: 'TextBlock',
              text: 'PR Reminder',
              weight: 'Bolder',
              size: 'Medium',
              wrap: false,
            },
          ],
          verticalContentAlignment: 'Center',
        },
      ],
    },
  ];

  if (prInfo) {
    body.push({
      type: 'TextBlock',
      text: `Pull Request | [${prInfo.repoName} #${prInfo.prNumber}](${prUrl})`,
      wrap: true,
      size: 'Small',
      isSubtle: true,
      spacing: 'Small',
    });
  }

  body.push({
    type: 'TextBlock',
    text: prTitle,
    wrap: true,
    weight: 'Bolder',
    size: 'Large',
    spacing: 'Small',
  });

  if (hostedContents.length > 0) {
    if (cardMessage) {
      body.push({
        type: 'TextBlock',
        text: cardMessage,
        wrap: true,
        spacing: 'Small',
      });
    }
    body.push(...imageElements);
  }

  if (prInfo?.adoWorkItems.length) {
    const items = prInfo.adoWorkItems
      .map((wi) => `[${wi.id}](${wi.url}) — ${wi.state}${wi.sprint ? ` (${wi.sprint})` : ''}`)
      .join(' · ');
    body.push({
      type: 'TextBlock',
      text: `**Work Items:** ${items}`,
      wrap: true,
      spacing: 'Medium',
      size: 'Small',
    });
  }

  if (prInfo) {
    const pill = mergeStatePill(prInfo.mergeableState);
    body.push({
      type: 'TextBlock',
      text: `${pill.dot} **${pill.label}**  ·  ${prInfo.authorLogin} wants to merge`,
      wrap: true,
      spacing: 'Medium',
      size: 'Small',
    });
  }

  const facts: string[] = [];
  if (prInfo) facts.push(`${prInfo.totalReviewers} Reviewer(s)`);
  if (reviewerText) facts.push(`Pending: ${reviewerText}`);

  if (facts.length > 0) {
    body.push({
      type: 'TextBlock',
      text: facts.join('  ·  '),
      wrap: true,
      spacing: 'Small',
      size: 'Small',
      isSubtle: true,
    });
  }

  const card = {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.4',
    body,
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View pull request',
        url: prUrl,
      },
    ],
    msteams: {
      width: 'Full',
    },
  };

  return card;
}

async function buildMessagePayload(
  prTitle: string,
  prUrl: string,
  reviewers: { email: string; displayName: string }[],
  customMessage?: string,
  prInfo?: PrCardInfo,
) {
  const msg = customMessage || 'please review this PR.';
  const { mentions, resolved } = await resolveReviewers(reviewers);
  const { cleanedHtml, hostedContents } = extractBase64Images(msg);

  const hasImages = hostedContents.length > 0;
  const mentionBody = hasImages
    ? buildMentionBody(mentions)
    : `${buildMentionBody(mentions)}${msg}`;
  const adaptiveCard = buildAdaptiveCard(prTitle, prUrl, resolved, cleanedHtml, hostedContents, prInfo);

  return { mentionBody, adaptiveCard, mentions, hostedContents };
}

export async function sendChannelMessage(
  teamId: string,
  channelId: string,
  prTitle: string,
  prUrl: string,
  reviewers: { email: string; displayName: string }[],
  customMessage?: string,
  prInfo?: PrCardInfo,
): Promise<void> {
  const { mentionBody, adaptiveCard, mentions, hostedContents } = await buildMessagePayload(
    prTitle,
    prUrl,
    reviewers,
    customMessage,
    prInfo,
  );

  await graphFetch(`/teams/${teamId}/channels/${channelId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      body: {
        contentType: 'html',
        content: `${mentionBody}<attachment id="adaptiveCard1"></attachment>`,
      },
      attachments: [
        {
          id: 'adaptiveCard1',
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: JSON.stringify(adaptiveCard),
        },
      ],
      mentions,
      hostedContents,
    }),
  });
}

