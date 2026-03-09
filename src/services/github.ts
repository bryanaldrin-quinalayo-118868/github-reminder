import type { Repo, PullRequest, ReviewStatus } from '@/types/github';
import { fetchWorkItemStates } from '@/services/ado';

const GITHUB_API = 'https://api.github.com';
const GRAPHQL_API = 'https://api.github.com/graphql';
const ORG = 'nelnet-nbs';
const REPO_PREFIX = 'daycare-';

function getHeaders(): HeadersInit {
  const token = import.meta.env.VITE_GITHUB_TOKEN as string;
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchDaycareRepos(): Promise<Repo[]> {
  const repos: Repo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${GITHUB_API}/orgs/${ORG}/repos?per_page=${perPage}&page=${page}&sort=name`,
      { headers: getHeaders() },
    );

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const data: Repo[] = await res.json();
    if (data.length === 0) break;

    repos.push(...data.filter((r) => r.name.startsWith(REPO_PREFIX)));
    if (data.length < perPage) break;
    page++;
  }

  return repos.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// GraphQL — batch fetch reviews + thread resolution for all open PRs in a repo
// ---------------------------------------------------------------------------

type GQLReviewData = {
  reviews: { login: string; state: string; avatarUrl: string }[];
  threads: { authorLogin: string; isResolved: boolean }[];
};

const REVIEW_QUERY = `
  query($owner: String!, $repo: String!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequests(states: OPEN, first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          reviews(first: 100) {
            nodes {
              state
              author { login avatarUrl }
            }
          }
          reviewThreads(first: 100) {
            nodes {
              isResolved
              comments(first: 1) {
                nodes {
                  author { login }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchReviewDataBatch(repoName: string): Promise<Map<number, GQLReviewData>> {
  const result = new Map<number, GQLReviewData>();
  let cursor: string | null = null;

   
  while (true) {
    const res = await fetch(GRAPHQL_API, {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: REVIEW_QUERY,
        variables: { owner: ORG, repo: repoName, cursor },
      }),
    });

    if (!res.ok) throw new Error(`GitHub GraphQL error: ${res.status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);

    const connection = json.data.repository.pullRequests;
     
    for (const pr of connection.nodes) {
      result.set(pr.number, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reviews: (pr.reviews.nodes as any[])
          .filter((r) => r.author)
          .map((r) => ({ login: r.author.login, state: r.state, avatarUrl: r.author.avatarUrl })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        threads: (pr.reviewThreads.nodes as any[]).map((t) => ({
          authorLogin: t.comments.nodes[0]?.author?.login ?? '',
          isResolved: t.isResolved,
        })),
      });
    }

    if (!connection.pageInfo.hasNextPage) break;
    cursor = connection.pageInfo.endCursor;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAdoIds(body: string | null): number[] {
  if (!body) return [];
  const matches = body.matchAll(/https:\/\/dev\.azure\.com\/[^\s)]+\/_workitems\/edit\/(\d+)/g);
  const ids = new Set<number>();
  for (const m of matches) {
    ids.add(Number(m[1]));
  }
  return [...ids];
}

function resolveReviewStatus(
  login: string,
  latestState: string,
  threads: GQLReviewData['threads'],
): ReviewStatus {
  if (latestState === 'CHANGES_REQUESTED') return 'changes-requested';

  if (latestState === 'COMMENTED') {
    const userThreads = threads.filter((t) => t.authorLogin === login);
    // No inline threads → treat as resolved (PR-level comment only)
    if (userThreads.length === 0) return 'commented-resolved';
    const allResolved = userThreads.every((t) => t.isResolved);
    return allResolved ? 'commented-resolved' : 'commented';
  }

  return 'pending';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchOpenPullRequests(repoName: string): Promise<PullRequest[]> {
  const rawPrs: Omit<PullRequest, 'pendingReviewers' | 'adoWorkItems'>[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${GITHUB_API}/repos/${ORG}/${repoName}/pulls?state=open&per_page=${perPage}&page=${page}`,
      { headers: getHeaders() },
    );

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const data: Omit<PullRequest, 'pendingReviewers'>[] = await res.json();
    if (data.length === 0) break;

    rawPrs.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  // Batch-fetch review data via GraphQL (reviews + thread resolution)
  let reviewDataMap = new Map<number, GQLReviewData>();
  try {
    reviewDataMap = await fetchReviewDataBatch(repoName);
  } catch {
    // GraphQL failed — continue without review enrichment
  }

  // Parse ADO work item IDs from all PRs and batch-fetch their states
  const prAdoIds = rawPrs.map((pr) => parseAdoIds(pr.body));
  const allAdoIds = [...new Set(prAdoIds.flat())];
  let adoMap = new Map<number, { id: number; url: string; state: string }>();
  try {
    const adoItems = await fetchWorkItemStates(allAdoIds);
    adoMap = new Map(adoItems.map((wi) => [wi.id, wi]));
  } catch {
    // ADO fetch failed (PAT missing or invalid) — continue without statuses
  }

  const prs = rawPrs.map((pr, i) => {
    const reviewData = reviewDataMap.get(pr.number);

    // Get latest review state per user from GraphQL data
    const latestByLogin = new Map<string, { state: string; avatarUrl: string }>();
    if (reviewData) {
      for (const review of reviewData.reviews) {
        latestByLogin.set(review.login, { state: review.state, avatarUrl: review.avatarUrl });
      }
    }

    const approvedLogins = new Set(
      [...latestByLogin.entries()]
        .filter(([, v]) => v.state === 'APPROVED')
        .map(([login]) => login),
    );

    // Build pending map: start with requested_reviewers, add commenters/change-requesters
    const requestedMap = new Map(pr.requested_reviewers.map((r) => [r.login, r]));

    for (const [login, data] of latestByLogin) {
      if (approvedLogins.has(login)) continue;
      if (data.state === 'COMMENTED' || data.state === 'CHANGES_REQUESTED') {
        if (!requestedMap.has(login)) {
          // Re-add reviewer removed from requested_reviewers by GitHub
          requestedMap.set(login, {
            id: 0,
            login,
            avatar_url: data.avatarUrl,
            html_url: `https://github.com/${login}`,
          });
        }
      }
    }

    const threads = reviewData?.threads ?? [];

    const pendingReviewers = [...requestedMap.values()]
      .filter((r) => !approvedLogins.has(r.login))
      .map((r) => {
        const latest = latestByLogin.get(r.login);
        return {
          ...r,
          reviewStatus: latest
            ? resolveReviewStatus(r.login, latest.state, threads)
            : 'pending' as ReviewStatus,
        };
      });

    const adoWorkItems = prAdoIds[i]
      .map((id) => adoMap.get(id))
      .filter((wi): wi is NonNullable<typeof wi> => !!wi);

    return { ...pr, pendingReviewers, adoWorkItems, repoName };
  });

  return prs;
}
