
import { Effect as E } from 'effect';
import { inject, injectable } from 'tsyringe'
import { Schema as S } from 'effect'
import { DocumentId, UserId } from '@/app/domain/refined/uuid'
import { UserContext } from '@/presentation/http/orpc/auth';
import { BusinessRuleViolationError } from '@/app/domain/shared/base.errors';
import { logger } from '@/app/application/utils/logger';
import { AccessPolicyRepository } from '@/app/domain/access-policy/repository'
import { TOKENS } from '@/app/infrastructure/di/tokens'

@injectable()
export class AccessControlService {
  constructor(
    @inject(TOKENS.ACCESS_POLICY_REPOSITORY)
    private readonly accessRepo: AccessPolicyRepository
  ) {}

  private isOwnerAllowed(resource: string, action: string): boolean {
    if (resource === 'document') {
      const ownerAllowed = ['create', 'read', 'write', 'update', 'delete', 'manage', 'publish', 'upload', 'grant', 'revoke']
      return ownerAllowed.includes(action)
    }
    if (resource === 'accessPolicy' && (action === 'grant' || action === 'revoke')) return true
    return false
  }
  /**
   * requirePermission: succeed if the caller has permission; otherwise fail.
   * Designed for composition in Effect pipelines.
   */
  requirePermission(
    user: UserContext, 
    resource: string, 
    action: string, 
    context?: { resourceOwnerId?: string; resourceId?: string }
  ): E.Effect<void, BusinessRuleViolationError> {
    // Owner override - if user is the owner, they have all allowed actions
    if (context?.resourceOwnerId === user.userId && this.isOwnerAllowed(resource, action)) {
      return E.succeed(undefined)
    }

    // Policy-based grants for documents - check if user has permission via access policy
    // This applies even if resourceOwnerId is provided (user might not be owner but has policy-based access)
    if (resource === 'document' && context?.resourceId) {
      return S.decodeUnknown(DocumentId)(context.resourceId).pipe(
        E.mapError(() =>
          BusinessRuleViolationError.withContext(
            'ACCESS_DENIED',
            `User does not have permission to ${action} ${resource}`,
            { userId: user.userId, resource, action }
          )
        ),
        E.flatMap((docId) => S.decodeUnknown(UserId)(user.userId).pipe(
          E.mapError(() =>
            BusinessRuleViolationError.withContext(
              'ACCESS_DENIED',
              `User does not have permission to ${action} ${resource}`,
              { userId: user.userId, resource, action }
            )
          ),
          E.flatMap((uid) => this.accessRepo.hasPermission(docId, uid, action)),
          E.mapError(() =>
            BusinessRuleViolationError.withContext(
              'ACCESS_DENIED',
              `User does not have permission to ${action} ${resource}`,
              { userId: user.userId, resource, action }
            )
          ),
          E.flatMap((allowed) =>
            allowed
              ? E.succeed(undefined)
              : E.fail(
                  BusinessRuleViolationError.withContext(
                    'ACCESS_DENIED',
                    `User does not have permission to ${action} ${resource}`,
                    { userId: user.userId, resource, action }
                  )
                )
          )
        ))
      )
    }
    logger.warn({ userId: user.userId, resource, action, context }, 'Access denied')
    return E.fail(
      BusinessRuleViolationError.withContext(
        'ACCESS_DENIED',
        `User does not have permission to ${action} ${resource}`,
        { userId: user.userId, resource, action }
      )
    )
  }
}