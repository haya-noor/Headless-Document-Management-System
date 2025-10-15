import { Schema as S, Effect } from "effect"
import crypto from "crypto"

const SHA256_RE = /^[a-f0-9]{64}$/i

export const Sha256 = S.String.pipe(
  S.filter((value) => SHA256_RE.test(value), { message: () => "Invalid SHA-256 hex" }),
  S.brand("Sha256")
)
export type Sha256 = S.Schema.Type<typeof Sha256>

export const makeSha256 = (input: unknown) => S.decodeUnknown(Sha256)(input)

/** Compute SHA-256 hex for Buffer or string, as an Effect */
export const computeSha256 = (
  data: Buffer | string
): Effect.Effect<Sha256, Error, never> =>
  Effect.try(() => {
    const buffer = typeof data === "string" ? Buffer.from(data) : data
    const hex = crypto.createHash("sha256").update(buffer).digest("hex")
    return S.decodeUnknownSync(Sha256)(hex)
  })

/** Verify data against expected SHA-256 hex */
export const verifySha256 = (
  data: Buffer | string,
  expected: unknown
): Effect.Effect<boolean, Error, never> =>
  computeSha256(data).pipe(
    Effect.map((actual) => S.decodeUnknownSync(Sha256)(expected) === actual)
  )
