import 'reflect-metadata';
import { Elysia } from 'elysia';
import { serverConfig } from '@/app/infrastructure/config/server.config';
import { logPlugin } from '@/app/application/middleware/log.middleware';
import { authPlugin } from '@/app/application/middleware/auth.middleware';
import { container } from 'tsyringe';
import { TOKENS } from '@/app/infrastructure/di/container';
import { DocumentWorkflow } from '@/app/application/workflows/doc.workflow';
import { UploadWorkflow } from '@/app/application/workflows/upload.workflow';

const app = new Elysia().use(logPlugin).use(authPlugin);

const doc = container.resolve<DocumentWorkflow>(DocumentWorkflow);
const upload = container.resolve<UploadWorkflow>(UploadWorkflow);

// Documents
app.post('/documents', async ({ body, set }) => await doc.createDocument(body).pipe());
app.put('/documents', async ({ body, set }) => await doc.updateDocument(body).pipe());
app.post('/documents/publish', async ({ body, set }) => await doc.publishDocument(body).pipe());
app.get('/documents/query', async ({ query, set }) => await doc.queryDocuments(query).pipe());

// Uploads
app.post('/uploads/initiate', async ({ body }) => await upload.initiateUpload(body).pipe());
app.post('/uploads/confirm', async ({ body }) => await upload.confirmUpload(body).pipe());

app.listen(serverConfig.port);
console.log(`API listening on http://localhost:${serverConfig.port}`);