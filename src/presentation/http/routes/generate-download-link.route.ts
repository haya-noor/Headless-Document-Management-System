/**
 * Generate download link route
 * POST /api/v1/documents/:id/download
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { documentService } from './service-factory';

export const generateDownloadLinkRoute = (app: Elysia) => app
  .post('/:id/download', async ({ params, body, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const { id } = params as any;
    const result = await documentService.generateDownloadLink(id, user.userId, body);
    
    set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
    return result;
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      expiresIn: t.Optional(t.Number()),
      filename: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Documents'],
      summary: 'Generate download link',
      description: 'Generate short-lived download link for document',
    },
  });
