/**
 * RTK (Reduced Token Kitchen) Hook for badlogic/pi-mono
 *
 * Intercepts bash commands and rewrites them using `rtk rewrite` for token savings.
 * This is a thin delegating hook - all rewrite logic lives in the `rtk` binary.
 *
 * NOTE: Due to API changes in pi-coding-agent, the `tool_call` event receives
 * a cloned copy of the arguments (via structuredClone in validateToolArguments).
 * Mutations to event.input.command do not affect actual tool execution.
 * 
 * This extension uses the `user_bash` event which fires when the user types
 * ! or !! to run bash commands directly. This allows providing custom
 * BashOperations to wrap command execution.
 *
 * Usage:
 *   pi -e /path/to/this/extension.ts
 *
 * Or install globally:
 *   cp rtk.ts ~/.pi/agent/extensions/rtk.ts
 *   pi will auto-load extensions from ~/.pi/agent/extensions/
 */

import { execSync } from "node:child_process";
import type { ExtensionAPI, BashOperations, BashToolCallEvent, isToolCallEventType, UserBashEvent, UserBashEventResult } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	console.log("[rtk] Extension loaded!");

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

	console.log("[rtk] rtk available, setting up hooks");

	// Use user_bash event to intercept user-initiated bash commands (! prefix)
	// This event allows us to provide custom BashOperations that rewrite commands
	pi.on("user_bash", async (event, _ctx): Promise<UserBashEventResult | undefined> => {
		if (event.excludeFromContext) {
			// !! prefix - explicitly excluded from context, skip rewrite
			return undefined;
		}

		console.log("[rtk] user_bash event:", event.command);

		let rewrittenCommand = event.command;
		try {
			// rtk rewrite outputs the rewritten command to stdout, or exits 1 if no rewrite needed
			const rewritten = execSync(`rtk rewrite "${event.command.replace(/"/g, '\\"')}"`, {
				encoding: "utf-8",
				stdio: ["ignore", "pipe", "ignore"],
			}).trim();

			// If no change, return undefined to use default execution
			if (!rewritten || rewritten === event.command) {
				console.log("[rtk] No rewrite needed for:", event.command);
				return undefined;
			}

			rewrittenCommand = rewritten;
			console.log("[rtk] Rewrote:", event.command, "->", rewritten);
		} catch (e: unknown) {
			const err = e as Error;
			console.log("[rtk] rtk rewrite error:", err.message);
			// rtk rewrite exits 1 when no rewrite needed - fall through to default
			return undefined;
		}

		// Return custom operations that execute the rewritten command
		// We need to implement BashOperations interface to intercept the command
		const operations: BashOperations = {
			exec: async (command: string, cwd: string, options) => {
				// Import child_process dynamically to avoid top-level import issues
				const { spawn } = await import("node:child_process");

				return new Promise<{ exitCode: number | null }>((resolve) => {
					const child = spawn(rewrittenCommand, [], {
						cwd,
						env: { ...process.env, ...options.env },
						shell: true,
						signal: options.signal,
					});

					child.stdout?.on("data", (data: Buffer) => {
						options.onData(data);
					});

					child.stderr?.on("data", (data: Buffer) => {
						options.onData(data);
					});

					child.on("close", (code) => {
						resolve({ exitCode: code });
					});

					child.on("error", (err) => {
						console.error("[rtk] exec error:", err.message);
						resolve({ exitCode: 1 });
					});

					// Handle timeout
					if (options.timeout) {
						setTimeout(() => {
							child.kill();
							resolve({ exitCode: null });
						}, options.timeout);
					}
				});
			},
		};

		return { operations };
	});

	// Also register for tool_call events for agent-invoked bash commands
	// Note: Due to structuredClone in validateToolArguments, mutations don't affect execution
	// but we can still log the events for debugging
	pi.on("tool_call", async (event, _ctx) => {
		// Use type guard for proper typing
		if (!isToolCallEventType("bash", event)) return;

		const bashEvent = event as BashToolCallEvent;
		const command = bashEvent.input?.command;
		if (!command || typeof command !== "string") return;

		console.log("[rtk] tool_call event (note: mutations won't affect execution):", command);

		// Try to rewrite - but note this won't actually modify execution
		// due to the structuredClone in validateToolArguments
		try {
			const rewritten = execSync(`rtk rewrite "${command.replace(/"/g, '\\"')}"`, {
				encoding: "utf-8",
				stdio: ["ignore", "pipe", "ignore"],
			}).trim();

			if (rewritten && rewritten !== command) {
				console.log("[rtk] Would rewrite (but mutation doesn't work):", command, "->", rewritten);
				// Attempt mutation - this won't work due to API constraints
				bashEvent.input.command = rewritten;
			}
		} catch {
			// rtk rewrite exits 1 when no rewrite needed
		}
	});
}
