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
 *   cp rtk.ts ~/.pi/agent/extensions/rtk.ts
 *   pi will auto-load extensions from ~/.pi/agent/extensions/
 */

import { execSync } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

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
		console.warn("[rtk] WARNING: rtk not found in PATH. Install from https://github.com/rtk-ai/rtk");
		return;
	}

	// Intercept tool_call events to rewrite bash commands via rtk
	pi.on("tool_call", async (event, _ctx) => {
		if (event.toolName !== "bash") return;
		
		const command = event.input?.command;
		if (!command || typeof command !== "string") return;

		try {
			// rtk rewrite outputs the rewritten command to stdout, or exits 1 if no rewrite needed
			const rewritten = execSync(`rtk rewrite "${command.replace(/"/g, '\\"')}"`, {
				encoding: "utf-8",
				stdio: ["ignore", "pipe", "ignore"],
			}).trim();

			// If no change, return original
			if (!rewritten || rewritten === command) return;

			// Modify the command in place
			event.input.command = rewritten;
		} catch {
			// rtk rewrite exits 1 when no rewrite needed - that's fine
		}
	});
}
