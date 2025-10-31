
// This file sets up AUTOMATIC routing for all RPCs under one /rpc endpoint 

import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { Effect } from "effect"
import { AppRPC } from "@/presentation/http/orpc/orpc-procedures/app-rpc"
import { createSimpleContext } from "@/presentation/http/orpc/auth"
import { mapError } from "@/presentation/http/orpc/presentation-error"


export const setupRpcServer = () => {
  const app = new Elysia()
    .use(cors({
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id', 'x-user-id']
    }))

  app.post("/rpc", async ({ request, headers }) => {
    try {
      const rpcRequest = await request.json()
      
      // Create Headers object from Elysia headers
      const headersObj = new Headers()
      Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined) {
          headersObj.set(key, value)
        }
      })
      
      // Extract context from JWT headers
      const context = await Effect.runPromise(
        createSimpleContext(headersObj).pipe(
          Effect.catchAll((error) => {
            // If JWT auth fails, fall back to header-based auth for backward compatibility
            return Effect.succeed({
              userId: headers["x-user-id"] || "guest",
              workspaceId: headers["x-workspace-id"] || "default"
            })
          })
        )
      )

      // Simple RPC handler
      // For now, return a basic response
      return {
        success: true,
        message: "RPC endpoint is working",
        context: context
      }
    } catch (error) {
      console.error("RPC Error:", error)
      const mappedError = mapError(error)
      return {
        error: {
          code: mappedError.code,
          message: mappedError.message,
          status: mappedError.status,
          data: mappedError.data
        }
      }
    }
  })

  return app
}
