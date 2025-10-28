import { t } from 'elysia'
import { AccessPolicyWorkflow } from '@/app/application/workflows/access-policy.workflow'
import {
CheckAccessDTOSchema,
} from '@/app/application/dtos/access-policy/check-access.dto'
import { GrantAccessDTO } from '@/app/application/dtos/access-policy/grant-access.dto'
import { RevokeAccessDTO } from '@/app/application/dtos/access-policy/revoke-access.dto'
import { runEffect } from '@/app/domain/shared/validation.utils'
import { auditLogger } from '@/app/application/services/audit-logger.service'
import { getSystemUser } from '@/app/infrastructure/utils/system-user'


export const accessPolicyRoutes = (workflow: AccessPolicyWorkflow) =>
t.group('/access-policy', (app) =>
app
.post('/grant', async ({ body }) => { 
const input = await runEffect(GrantAccessDTOSchema.decodeUnknown(body))
const user = await runEffect(getSystemUser())


const result = await runEffect(workflow.grantAccess(input))


await runEffect(
auditLogger.logAccessControlChange(
'access_granted',
input.documentId,
'grant',
user,
input.grantedTo,
'success'
)
)


return result
})
.post('/revoke', async ({ body }) => {
const input = await runEffect(RevokeAccessDTOSchema.decodeUnknown(body))
const user = await runEffect(getSystemUser())


const result = await runEffect(workflow.revokeAccess(input))


await runEffect(
auditLogger.logAccessControlChange(
'access_revoked',
input.documentId,
'revoke',
user,
input.revokedFrom,
'success'
)
)


return result
})
.post('/check', async ({ body }) => {
const input = await runEffect(CheckAccessDTOSchema.decodeUnknown(body))
const user = await runEffect(getSystemUser())


const result = await runEffect(workflow.checkAccess(input))


await runEffect(
auditLogger.logAccessControlChange(
'access_checked',
input.documentId,
'check',
user,
input.userId,
'success',
{ action: input.action }
)
)


return result
})
)