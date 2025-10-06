/**
 * Update document metadata route
 * PUT /api/v1/documents/:id/metadata
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { documentService } from './service-factory';

export const updateMetadataRoute = (app: Elysia) => app
  .put('/:id/metadata', async ({ params, body, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const { id } = params as any;
    const { metadata } = body as any;
    const result = await documentService.updateDocumentMetadata(id, user.userId, metadata);
    
    set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
    return result;
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      metadata: t.Record(t.String(), t.Any()),
    }),
    detail: {
      tags: ['Documents'],
      summary: 'Update document metadata',
      description: 'Update document metadata only',
    },
  });
