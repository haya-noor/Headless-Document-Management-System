/**
 * Update document route
 * PUT /api/v1/documents/:id
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { documentService } from './service-factory';

export const updateDocumentRoute = (app: Elysia) => app
  .put('/:id', async ({ params, body, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const { id } = params as any;
    const result = await documentService.updateDocument(id, body, user.userId);
    
    set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
    return result;
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      filename: t.Optional(t.String()),
      tags: t.Optional(t.Array(t.String())),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
      description: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Documents'],
      summary: 'Update document',
      description: 'Update document metadata',
    },
  });
