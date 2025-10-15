/**
 * Run all integration tests in sequence
 * Note: Bun crashes with integration tests due to ssh2/libuv issue
 * This runner provides information about the current status
 */

import { execSync } from "child_process"

const run = (cmd: string, description: string) => {
  console.log(`\n🚀 ${description}`)
  console.log(`   Command: ${cmd}`)
  try {
    execSync(cmd, { stdio: "inherit" })
    console.log(`✅ ${description} - PASSED`)
  } catch (error) {
    console.log(`❌ ${description} - FAILED`)
    console.log(`   Error: ${error}`)
  }
}

console.log("=".repeat(60))
console.log("INTEGRATION TESTS RUNNER")
console.log("=".repeat(60))
console.log("⚠️  Note: Bun integration tests crash due to ssh2/libuv issue")
console.log("   Use 'npx tsx' for individual test files instead")
console.log("=".repeat(60))

// Try running with different approaches
run("bun test tests/integration/user.repository.integration.test.ts", "User Repository Test (Bun)")
run("bun test tests/integration/document.e2e.test.ts", "Document E2E Test (Bun)")

console.log("\n" + "=".repeat(60))
console.log("ALTERNATIVE APPROACHES:")
console.log("=".repeat(60))
console.log("1. Run individual tests with tsx:")
console.log("   npx tsx tests/integration/user.repository.integration.test.ts")
console.log("   npx tsx tests/integration/document.e2e.test.ts")
console.log("")
console.log("2. Use Node.js with ts-node:")
console.log("   node --loader ts-node/esm tests/integration/user.repository.integration.test.ts")
console.log("")
console.log("3. Focus on domain tests (working):")
console.log("   bun test tests/domain/")
console.log("=".repeat(60))
