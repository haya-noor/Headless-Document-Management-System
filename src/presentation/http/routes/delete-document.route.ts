/**
 * Delete document route
 * DELETE /api/v1/documents/:id
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { documentService } from './service-factory';

export const deleteDocumentRoute = (app: Elysia) => app
  .delete('/:id', async ({ params, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const { id } = params as any;
    const result = await documentService.deleteDocument(id, user.userId);
    
    set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
    return result;
  }, {
    params: t.Object({
      id: t.String(),
    }),
    detail: {
      tags: ['Documents'],
      summary: 'Delete document',
      description: 'Delete document by ID',
    },
  });
