/**
 * Search documents route
 * GET /api/v1/documents
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { documentService } from './service-factory';

export const searchDocumentsRoute = (app: Elysia) => app
  .get('/', async ({ query, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const result = await documentService.searchDocumentsWithTransforms(query as any, user.userId);
    
    set.status = 200;
    return result;
  }, {
    query: t.Object({
      query: t.Optional(t.String()),
      tags: t.Optional(t.Array(t.String())),
      mimeType: t.Optional(t.String()),
      page: t.Optional(t.Number()),
      limit: t.Optional(t.Number()),
      sortBy: t.Optional(t.String()),
      sortOrder: t.Optional(t.String()),
      dateFrom: t.Optional(t.String()),
      dateTo: t.Optional(t.String()),
      uploadedBy: t.Optional(t.String()),
      minSize: t.Optional(t.Number()),
      maxSize: t.Optional(t.Number()),
    }),
    detail: {
      tags: ['Documents'],
      summary: 'Search documents',
      description: 'Search documents with advanced filters',
    },
  });
