import { RpcGroup } from "@effect/rpc"
import { DocumentRPC } from "./document.rpc"
import { UploadRPC } from "./upload.rpc"
import { DocumentVersionRPC } from "./document-version.rpc"
import { DownloadTokenRPC } from "./download-token.rpc"
import { AccessPolicyRPC } from "./access-policy.rpc"

export const AppRPC = RpcGroup.make(
  ...DocumentRPC.requests.values(),
  ...UploadRPC.requests.values(),
  ...DocumentVersionRPC.requests.values(),
  ...DownloadTokenRPC.requests.values(),
  ...AccessPolicyRPC.requests.values()
)
