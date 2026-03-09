import { toast } from 'sonner';
import type { Repo, PullRequest, Reviewer, ReviewStatus } from '@/types/github';
import { fetchWorkItemStates } from '@/services/ado';
import { getStoredToken } from '@/services/github-auth';

const GITHUB_API = 'https://api.github.com';
const ORG = 'nelnet-nbs';
const REPO_PREFIX = 'daycare-';

type Review = {
  id: number;
  user: Reviewer;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
};

function getHeaders(): HeadersInit {
  const token = getStoredToken() ?? (import.meta.env.VITE_GITHUB_TOKEN as string);
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
  };
}

let rateLimitToastShown = false;

function checkRateLimit(res: Response): void {
  if ((res.status === 403 || res.status === 429) && !rateLimitToastShown) {
    const reset = res.headers.get('x-ratelimit-reset');
    const remaining = res.headers.get('x-ratelimit-remaining');
    const resetTime = reset ? new Date(Number(reset) * 1000).toLocaleTimeString() : 'soon';
    toast.error(`GitHub API rate limit hit (${remaining ?? 0} remaining). Resets at ${resetTime}.`, { duration: 10000 });
    rateLimitToastShown = true;
    setTimeout(() => { rateLimitToastShown = false; }, 60000);
  }
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

    checkRateLimit(res);
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
// REST — per-PR review fetch
// ---------------------------------------------------------------------------

async function fetchPRReviews(repoName: string, prNumber: number): Promise<Review[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${ORG}/${repoName}/pulls/${prNumber}/reviews`,
    { headers: getHeaders() },
  );

  checkRateLimit(res);
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function fetchPRMergeableState(repoName: string, prNumber: number, retries = 1): Promise<PullRequest['mergeableState']> {
  const res = await fetch(
    `${GITHUB_API}/repos/${ORG}/${repoName}/pulls/${prNumber}`,
    { headers: getHeaders() },
  );

  checkRateLimit(res);
  if (!res.ok) return 'unknown';

  const data: { mergeable_state?: string; mergeable?: boolean | null; draft?: boolean } = await res.json();
  if (data.draft) return 'draft';
  const state = data.mergeable_state;
  if (state === 'clean' || state === 'blocked' || state === 'behind' || state === 'dirty' || state === 'unstable') {
    return state;
  }

  // GitHub returns "unknown" while computing mergeability — retry after a short delay
  if (retries > 0 && (state === 'unknown' || data.mergeable === null)) {
    await new Promise((r) => setTimeout(r, 1500));
    return fetchPRMergeableState(repoName, prNumber, retries - 1);
  }
  return 'unknown';
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

function resolveReviewStatus(latestState: string): ReviewStatus {
  if (latestState === 'CHANGES_REQUESTED') return 'changes-requested';
  if (latestState === 'COMMENTED') return 'commented';
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

    checkRateLimit(res);
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }

    const data: Omit<PullRequest, 'pendingReviewers'>[] = await res.json();
    if (data.length === 0) break;

    rawPrs.push(...data);
    if (data.length < perPage) break;
    page++;
  }

  // Parse ADO work item IDs from all PRs and batch-fetch their states (non-blocking)
  const prAdoIds = rawPrs.map((pr) => parseAdoIds(pr.body));
  const allAdoIds = [...new Set(prAdoIds.flat())];
  let adoMap = new Map<number, { id: number; url: string; state: string; sprint: string }>();
  try {
    const adoItems = await fetchWorkItemStates(allAdoIds);
    adoMap = new Map(adoItems.map((wi) => [wi.id, wi]));
  } catch {
    // ADO fetch failed (PAT missing or invalid) — continue without statuses
  }

  const prs = await Promise.all(
    rawPrs.map(async (pr, i) => {
      const [reviews, mergeableState] = await Promise.all([
        fetchPRReviews(repoName, pr.number),
        fetchPRMergeableState(repoName, pr.number),
      ]);

      // Get the latest review state per user
      const latestByUser = new Map<number, Review>();
      for (const review of reviews) {
        if (!review.user) continue;
        latestByUser.set(review.user.id, review);
      }

      // Only APPROVED removes a reviewer from the pending list
      const approvedUserIds = new Set(
        [...latestByUser.values()]
          .filter((r) => r.state === 'APPROVED')
          .map((r) => r.user.id),
      );

      // Reviewers who commented or requested changes but haven't approved.
      // GitHub removes them from requested_reviewers once they submit ANY review,
      // so we must re-add them from the reviews data.
      const activeReviews = [...latestByUser.values()]
        .filter((r) => (r.state === 'COMMENTED' || r.state === 'CHANGES_REQUESTED') && !approvedUserIds.has(r.user.id));

      // Start with requested_reviewers (people who haven't acted yet)
      const requestedMap = new Map(pr.requested_reviewers.map((r) => [r.id, r]));

      // Add commenters/change-requesters who are no longer in requested_reviewers
      for (const review of activeReviews) {
        if (!requestedMap.has(review.user.id)) {
          requestedMap.set(review.user.id, review.user);
        }
      }

      const pendingReviewers = [...requestedMap.values()]
        .filter((reviewer) => !approvedUserIds.has(reviewer.id))
        .map((reviewer) => {
          const latest = latestByUser.get(reviewer.id);
          return {
            ...reviewer,
            reviewStatus: latest
              ? resolveReviewStatus(latest.state)
              : 'pending' as ReviewStatus,
          };
        });

      const adoWorkItems = prAdoIds[i]
        .map((id) => adoMap.get(id))
        .filter((wi): wi is NonNullable<typeof wi> => !!wi);

      return { ...pr, pendingReviewers, adoWorkItems, repoName, mergeableState };
    }),
  );

  return prs;
}
