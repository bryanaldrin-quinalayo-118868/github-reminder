export type Repo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
};

export type Reviewer = {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
};

export type ReviewStatus =
  | 'pending'
  | 'commented'
  | 'commented-unresolved'
  | 'changes-requested'
  | 'approved'
  | 'approved-unresolved';

export type PendingReviewer = Reviewer & {
  reviewStatus: ReviewStatus;
};

export type AdoWorkItem = {
  id: number;
  url: string;
  state: string;
  sprint: string;
};

export type PullRequest = {
  id: number;
  number: number;
  title: string;
  html_url: string;
  body: string | null;
  updated_at: string;
  user: Reviewer;
  requested_reviewers: Reviewer[];
  pendingReviewers: PendingReviewer[];
  adoWorkItems: AdoWorkItem[];
  repoName: string;
  mergeableState: 'clean' | 'blocked' | 'behind' | 'dirty' | 'unstable' | 'draft' | 'unknown';
};

export type UserMapping = {
  githubUsername: string;
  teamsEmail: string;
};
