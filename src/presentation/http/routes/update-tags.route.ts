/**
 * Update document tags route
 * PUT /api/v1/documents/:id/tags
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { documentService } from './service-factory';

export const updateTagsRoute = (app: Elysia) => app
  .put('/:id/tags', async ({ params, body, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const { id } = params as any;
    const { tags } = body as any;
    const result = await documentService.updateDocumentTags(id, user.userId, tags);
    
    set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
    return result;
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      tags: t.Array(t.String()),
    }),
    detail: {
      tags: ['Documents'],
      summary: 'Update document tags',
      description: 'Update document tags only',
    },
  });
