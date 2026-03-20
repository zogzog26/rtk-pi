/**
 * RTK (Reduced Token Kitchen) Hook for badlogic/pi-mono
 *
 * Intercepts bash commands and rewrites them using `rtk rewrite` for token savings.
 * This is a thin delegating hook - all rewrite logic lives in the `rtk` binary.
 *
 * Usage:
 *   pi -e /path/to/this/extension.ts
 *
 * Or install globally:
 *   cp hooks/pi-rtk-rewrite.ts ~/.pi/agent/extensions/rtk.ts
 *   pi will auto-load extensions from ~/.pi/agent/extensions/
 */

import { createBashTool } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();

	// Check if rtk is available
	let rtkAvailable = false;
	try {
		execSync("rtk --version", { stdio: "ignore" });
		rtkAvailable = true;
	} catch {
		// rtk not available, skip hook
	}

	if (!rtkAvailable) {
		console.warn("[rtk] WARNING: rtk not found in PATH. Install from https://github.com/rtk-ai/rtk");
		return;
	}

	// Create bash tool with spawnHook that rewrites commands via rtk
	const bashTool = createBashTool(cwd, {
		spawnHook: ({ command, cwd, env }) => {
			try {
				// Delegate rewrite logic to rtk binary
				// rtk rewrite outputs the rewritten command to stdout, or exits 1 if no rewrite needed
				const rewritten = execSync(`rtk rewrite "${command.replace(/"/g, '\\"')}"`, {
					cwd,
					env,
					encoding: "utf-8",
					stdio: ["ignore", "pipe", "ignore"],
				}).trim();

				// If no change, return original
				if (!rewritten || rewritten === command) {
					return { command, cwd, env };
				}

				console.error(`[rtk] Rewrote: ${command} -> ${rewritten}`);
				return { command: rewritten, cwd, env };
			} catch {
				// rtk rewrite exits 1 when no rewrite needed - that's fine
				return { command, cwd, env };
			}
		},
	});

	pi.registerTool({
		...bashTool,
		execute: async (id, params, signal, onUpdate, _ctx) => {
			return bashTool.execute(id, params, signal, onUpdate);
		},
	});
}
