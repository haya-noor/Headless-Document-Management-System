/**
 * Update document permissions route
 * PUT /api/v1/documents/:id/permissions
 */

import { Elysia, t } from 'elysia';
import { getAuthenticatedUser, createUnauthorizedResponse } from '../middleware/auth.middleware';
import { documentService } from './service-factory';

export const updatePermissionsRoute = (app: Elysia) => app
  .put('/:id/permissions', async ({ params, body, set, headers }) => {
    const user = getAuthenticatedUser(headers);
    if (!user) {
      set.status = 401;
      return createUnauthorizedResponse();
    }
    
    const { id } = params as any;
    const { permissions } = body as any;
    const result = await documentService.updateDocumentPermissions(id, permissions, user.userId);
    
    set.status = result.success ? 200 : (result.error === 'DOCUMENT_NOT_FOUND' ? 404 : 403);
    return result;
  }, {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      permissions: t.Array(t.Object({
        userId: t.String(),
        permission: t.String(),
      })),
    }),
    detail: {
      tags: ['Documents'],
      summary: 'Update document permissions',
      description: 'Update document access permissions',
    },
  });
