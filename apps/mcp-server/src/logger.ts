import pino, { type Logger as PinoLogger, type TransportTargetOptions } from 'pino';
import { env } from './env.js';

/**
 * Structured logging for the MCP server.
 *
 * Ships to the same Axiom dataset as the backend, tagged `name: "mcp-log"` so the two are
 * separable in APL (the backend uses `name: "backend-log"`, the Next.js frontend
 * `source: "middleware"`).
 *
 * Deliberately never logs tool arguments or results: WiFi passwords, vCard contact details and
 * email addresses all pass through these tools, and this dataset has a far longer retention and
 * a far wider audience than the API itself.
 */
function buildLogger(): PinoLogger {
	const targets: TransportTargetOptions[] = [
		{ target: 'pino-pretty', level: env.LOG_LEVEL, options: { destination: 1 } },
	];

	if (env.AXIOM_DATASET && env.AXIOM_TOKEN) {
		targets.push({
			target: '@axiomhq/pino',
			level: env.LOG_LEVEL,
			options: { dataset: env.AXIOM_DATASET, token: env.AXIOM_TOKEN },
		});
	}

	return pino({
		level: env.LOG_LEVEL,
		name: 'mcp-log',
		base: { env: env.NODE_ENV },
		transport: { targets },
	});
}

export const logger = buildLogger();

export const axiomEnabled = !!(env.AXIOM_DATASET && env.AXIOM_TOKEN);

/** Identifies the connected agent, as reported during MCP `initialize`. */
export interface McpClientInfo {
	name?: string;
	version?: string;
	protocolVersion?: string;
}

/**
 * One row per tool invocation — the table that answers "which tools do agents actually reach
 * for, and where do they fail".
 */
export function logToolCall(fields: {
	tool: string;
	outcome: 'ok' | 'error';
	durationMs: number;
	sessionId?: string;
	client?: McpClientInfo;
	errorType?: string;
	status?: number;
	message?: string;
}): void {
	logger.info(
		{
			mcp: {
				...fields,
				durationMs: Math.round(fields.durationMs),
				message: fields.message?.slice(0, 300),
			},
		},
		'mcp.tool.call',
	);
}
