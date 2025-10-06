/**
 * Routes index
 * Exports all route definitions
 */

// Document routes
export { uploadDocumentRoute } from './upload-document.route';
export { getDocumentRoute } from './get-document.route';
export { searchDocumentsRoute } from './search-documents.route';
export { updateDocumentRoute } from './update-document.route';
export { deleteDocumentRoute } from './delete-document.route';
export { generateDownloadLinkRoute } from './generate-download-link.route';
export { updatePermissionsRoute } from './update-permissions.route';
export { updateMetadataRoute } from './update-metadata.route';
export { updateTagsRoute } from './update-tags.route';

// Authentication routes
export { registerRoute } from './register.route';
export { loginRoute } from './login.route';
export { logoutRoute } from './logout.route';
export { getProfileRoute } from './get-profile.route';
export { updateProfileRoute } from './update-profile.route';
export { changePasswordRoute } from './change-password.route';
export { deleteAccountRoute } from './delete-account.route';

// Legacy exports for backward compatibility
export { authRoutes } from './user.routes';
export { documentRoutes } from './document.routes';
