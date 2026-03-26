import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

const ADO_API = 'https://dev.azure.com/nbsdev';
const PROJECT = 'Daycare';

app.http('ado-workitems', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'ado/workitems',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const pat = process.env.ADO_PAT;
    if (!pat) {
      return { status: 500, jsonBody: { error: 'ADO_PAT not configured on server' } };
    }

    const idsParam = request.query.get('ids');
    if (!idsParam) {
      return { status: 400, jsonBody: { error: 'Missing "ids" query parameter' } };
    }

    // Validate that ids are all numeric
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.some((id) => !/^\d+$/.test(id))) {
      return { status: 400, jsonBody: { error: 'Invalid work item IDs' } };
    }

    try {
      const res = await fetch(
        `${ADO_API}/${PROJECT}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.State,System.IterationPath&api-version=7.1`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!res.ok) {
        return { status: res.status, jsonBody: { error: `ADO API error: ${res.status}` } };
      }

      const data = await res.json();
      return { status: 200, jsonBody: data };
    } catch {
      return { status: 502, jsonBody: { error: 'Failed to reach Azure DevOps API' } };
    }
  },
});
