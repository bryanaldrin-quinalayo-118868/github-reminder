import type { UserMapping } from '@/types/github';

// Map GitHub usernames to Teams emails.
// Team members can add themselves here.
const USER_MAPPINGS: UserMapping[] = [
  // { githubUsername: 'octocat', teamsEmail: 'octocat@example.com' },
];

export function getTeamsEmail(githubUsername: string): string | null {
  const mapping = USER_MAPPINGS.find(
    (m) => m.githubUsername.toLowerCase() === githubUsername.toLowerCase(),
  );
  return mapping?.teamsEmail ?? null;
}

export default USER_MAPPINGS;
