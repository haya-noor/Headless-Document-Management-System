import { Elysia } from 'elysia';
import { v4 as uuid } from 'uuid';
import logger from '../utils/logger';


export const logPlugin = new Elysia().derive(({ request }) => {
const requestId = uuid();
logger.info({ requestId, path: request.url, method: request.method }, 'Incoming request');
return { requestId };
});