# Standard Permissions Reference

## Default Permissions Available

The system supports the following standard permissions:

### Document Permissions

1. **`read`** - View/access document
   - Allows user to view document metadata and content
   - Workspace members have read access by default

2. **`write`** / **`update`** - Modify document (synonyms)
   - Both are treated as equivalent
   - "update" is normalized to "write" for storage
   - Allows user to modify document content and metadata
   - Can be granted by document owner

3. **`delete`** - Remove document
   - Allows user to delete document
   - Typically reserved for owner and admin

4. **`manage`** - Full control
   - Includes read, write, update, delete permissions
   - Can grant/revoke permissions to other users
   - Typically for owners and admins

### Default Role Permissions

#### **Admin**
- Document: `read`, `write`, `update`, `delete`, `manage`
- Workspace: `manage`
- Global: `manage`

#### **Editor**
- Document: `read`, `write`, `update`
- Workspace: `read`

#### **Viewer**
- Document: `read`
- Workspace: `read`

### Permission Granting

**Who can grant permissions:**
- Document owner can grant any permission to other users
- Admin can grant permissions to any document

**Owner permission flow:**
1. Document owner wants to grant `update` permission to User X
2. Owner calls `grantAccess()` with action `["update"]`
3. System verifies owner is the document owner
4. Creates access policy granting `update` permission
5. User X can now update the document

### Usage Examples

```typescript
// Using Builder Pattern (recommended)
const builder = GrantAccessBuilder.create()
  .forDocument(documentId)
  .grantedByUser(ownerId)
  .toUser(targetUserId)
  .withUpdate() // Grants update permission
  .withPriority(50)

await workflow.grantAccessWithBuilder(builder, owner)

// Quick helper for owner granting update
const builder = GrantAccessBuilder.ownerGrantsUpdate(
  documentId,
  ownerId,
  targetUserId
)

// Traditional method
await workflow.grantAccess({
  documentId,
  grantedBy: ownerId,
  grantedTo: targetUserId,
  actions: ["update"],
  priority: 100
}, owner)
```

### Permission Checking

The system uses `AccessControlService.can()` and `enforceAccess()` to check permissions:

```typescript
// Check permission
if (accessControl.can(user, "document", "update", {
  resourceOwnerId: document.ownerId,
  workspaceId: user.workspaceId
})) {
  // User can update
}

// Enforce permission (throws error if denied)
await accessControl.enforceAccess(user, "document", "update", {
  resourceOwnerId: document.ownerId
})
```

