const ADO_API = 'https://dev.azure.com/nbsdev';
const PROJECT = 'Daycare';

function getHeaders(): HeadersInit {
  const pat = import.meta.env.VITE_ADO_PAT as string;
  return {
    Authorization: `Basic ${btoa(`:${pat}`)}`,
    'Content-Type': 'application/json',
  };
}

export type AdoWorkItem = {
  id: number;
  url: string;
  state: string;
};

export async function fetchWorkItemStates(ids: number[]): Promise<AdoWorkItem[]> {
  if (ids.length === 0) return [];

  const res = await fetch(
    `${ADO_API}/${PROJECT}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.State&api-version=7.1`,
    { headers: getHeaders() },
  );

  if (!res.ok) return [];

  const data: { value: { id: number; fields: { 'System.State': string } }[] } = await res.json();

  return data.value.map((wi) => ({
    id: wi.id,
    url: `${ADO_API}/${PROJECT}/_workitems/edit/${wi.id}`,
    state: wi.fields['System.State'],
  }));
}

export function getStateColor(state: string): { bg: string; text: string } {
  switch (state) {
    case 'Active':
    case 'Resolved':
      return { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' };
    case 'In PR':
    case 'In UAT':
      return { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' };
    case 'Blocked':
      return { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300' };
    case 'Ready':
      return { bg: 'bg-lime-100 dark:bg-lime-900/40', text: 'text-lime-700 dark:text-lime-300' };
    case 'Closed':
      return { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300' };
    case 'Removed':
      return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-400 line-through' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
  }
}
