import logger from '../utils/logger';


export class AuditLoggerService {
log(event: string, data: Record<string, any>) {
logger.info({ event, ...data }, 'Audit log');
}
}