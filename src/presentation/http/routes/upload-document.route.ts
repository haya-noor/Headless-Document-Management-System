/**
 * Upload document route
 * POST /api/v1/documents
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { documentService } from './service-factory';

export const uploadDocumentRoute = (app: Elysia) => app
  .post('/', async ({ body, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const result = await documentService.uploadDocumentWithValidation((body as any).file, body, user.userId);
    
    set.status = result.success ? 201 : 400;
    return result;
  }, {
    body: t.Object({
      file: t.File(),
      tags: t.Optional(t.Array(t.String())),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
      description: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Documents'],
      summary: 'Upload document',
      description: 'Upload a new document with metadata',
    },
  });
