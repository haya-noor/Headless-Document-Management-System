import { jwt } from '@elysiajs/jwt';
import { Elysia } from 'elysia';
import { Effect as E } from 'effect';
import { UserId, WorkspaceId } from '@/app/domain/refined/uuid';
import { ValidationError } from '@/app/domain/shared/base.errors';
import logger from '@/presentation/utils/logger';

export interface UserContext {
  userId: UserId;
  workspaceId: WorkspaceId;
  roles: string[];
  permissions: string[];
}

export const authPlugin = new Elysia()
  .use(jwt({
    secret: process.env.JWT_SECRET!,
  }))
  .derive(async ({ jwt, headers, set, request }) => {
    const authHeader = headers['authorization'];
    
    if (!authHeader) {
      logger.warn({ path: request.url, method: request.method }, 'Missing authorization header');
      set.status = 401;
      throw new Error('Unauthorized: Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const payload = await jwt.verify(token);
      
      if (!payload || typeof payload !== 'object') {
        logger.warn({ path: request.url }, 'Invalid token payload');
        set.status = 401;
        throw new Error('Unauthorized: Invalid token');
      }

      // Validate required fields
      if (!payload.sub || !payload.workspaceId || !Array.isArray(payload.roles)) {
        logger.warn({ payload }, 'Token missing required fields');
        set.status = 401;
        throw new Error('Unauthorized: Invalid token structure');
      }

      const userContext: UserContext = {
        userId: payload.sub as UserId,
        workspaceId: payload.workspaceId as WorkspaceId,
        roles: Array.isArray(payload.roles) ? payload.roles as string[] : [],
        permissions: Array.isArray(payload.permissions) ? payload.permissions as string[] : [],
      };

      logger.info({ 
        userId: userContext.userId, 
        workspaceId: userContext.workspaceId,
        roles: userContext.roles 
      }, 'User authenticated successfully');

      return { userContext };
    } catch (error) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      logger.error({ error: errObj.message, path: request.url }, 'JWT verification failed');
      set.status = 401;
      throw new Error('Unauthorized: Token verification failed');
    }
  });