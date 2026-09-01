import { spawn } from "child_process"
import { loadProjectEnv, projectRoot } from "./load-env.mjs"

const env = loadProjectEnv()
const url = env.DATABASE_URL

if (!url) {
  console.error("DATABASE_URL not found in project .env")
  process.exit(1)
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx"

const child = spawn(
  npx,
  ["-y", "@modelcontextprotocol/server-postgres", url],
  {
    stdio: "inherit",
    env,
    cwd: projectRoot,
  },
)

child.on("exit", (code) => process.exit(code ?? 1))
