/**
 * RTK (Reduced Token Kitchen) Hook for badlogic/pi-mono
 *
 * Intercepts bash commands and rewrites them using `rtk rewrite` for token savings.
 *
 * This extension overrides the built-in bash tool to intercept and rewrite commands
 * before execution using a spawnHook.
 *
 * Usage:
 *   pi -e /path/to/this/extension.ts
 *
 * Or install globally:
 *   cp rtk.ts ~/.pi/agent/extensions/rtk.ts
 *   pi will auto-load extensions from ~/.pi/agent/extensions/
 */

import { execSync } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createBashTool } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	// Check if rtk is available
	let rtkAvailable = false;
	try {
		execSync("rtk --version", { stdio: "ignore" });
		rtkAvailable = true;
	} catch {
		// rtk not available, skip hook
	}

	if (!rtkAvailable) {
		return;
	}

	// Create a custom bash tool with spawnHook to rewrite commands
	const cwd = process.cwd();

	const bashTool = createBashTool(cwd, {
		spawnHook: ({ command, cwd, env }) => {
			try {
				// rtk rewrite outputs the rewritten command to stdout, or exits 1 if no rewrite needed
				const rewritten = execSync(`rtk rewrite "${command.replace(/"/g, '\\"')}"`, {
					encoding: "utf-8",
					stdio: ["ignore", "pipe", "ignore"],
				}).trim();

				if (rewritten && rewritten !== command) {
					return { command: rewritten, cwd, env };
				}
			} catch {
				// rtk rewrite exits 1 when no rewrite needed
			}

			return { command, cwd, env };
		},
	});

	// Register as "bash" to override the built-in bash tool
	pi.registerTool({
		...bashTool,
		name: "bash",
		execute: async (id, params, signal, onUpdate, _ctx) => {
			return bashTool.execute(id, params, signal, onUpdate);
		},
	});
}
