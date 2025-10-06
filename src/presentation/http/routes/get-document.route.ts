/**
 * Get document route
 * GET /api/v1/documents/:id
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { documentService } from './service-factory';

export const getDocumentRoute = (app: Elysia) => app
  .get('/:id', async ({ params, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const { id } = params as any;
    const result = await documentService.getDocument(id, user.userId);
    
    set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
    return result;
  }, {
    params: t.Object({
      id: t.String(),
    }),
    detail: {
      tags: ['Documents'],
      summary: 'Get document',
      description: 'Get document by ID',
    },
  });
