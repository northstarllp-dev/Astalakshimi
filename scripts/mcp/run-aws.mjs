import { spawn } from "child_process"
import { loadProjectEnv, projectRoot } from "./load-env.mjs"

const env = loadProjectEnv()
const npx = process.platform === "win32" ? "npx.cmd" : "npx"

const child = spawn(npx, ["-y", "@yawlabs/aws-mcp@latest"], {
  stdio: "inherit",
  env,
  cwd: projectRoot,
})

child.on("exit", (code) => process.exit(code ?? 1))
