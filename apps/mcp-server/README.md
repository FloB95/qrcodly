# QRcodly MCP Server

Remote-hosted [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes the QRcodly REST API as MCP tools. AI agents connect via Streamable HTTP transport and authenticate with a QRcodly API key.

## Architecture

```
AI Client → mcp.qrcodly.de/mcp → api.qrcodly.de/api/v1
             (this server)         (QRcodly REST API)
```

Tools are auto-generated from the bundled OpenAPI specification at startup. No manual schema mapping needed — update `src/openapi.json` when the API changes.

## Development

```bash
pnpm install
pnpm dev              # starts on http://localhost:3002/mcp
pnpm build            # compile TypeScript
pnpm lint             # ESLint
pnpm typecheck        # type check
```

### Environment Variables

| Variable               | Default                  | Description                                      |
| ---------------------- | ------------------------ | ------------------------------------------------ |
| `QRCODLY_API_BASE_URL` | `https://api.qrcodly.de` | QRcodly API base URL                             |
| `PORT`                 | `3002`                   | Server port                                      |
| `HOST`                 | `0.0.0.0`                | Server host                                      |
| `LOG_LEVEL`            | `info`                   | Pino log level                                   |
| `AXIOM_DATASET`        | –                        | Axiom dataset for usage telemetry (e.g. qrcodly) |
| `AXIOM_TOKEN`          | –                        | Axiom ingest token                               |

## Telemetry

With `AXIOM_DATASET` and `AXIOM_TOKEN` set, the server ships structured usage events to Axiom
under the pino logger name `mcp-log`. Without them it logs to stdout only and warns at startup.

| Event                     | Fields                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `mcp.server.started`      | `toolCount`, `apiBaseUrl`, `axiom`                                                         |
| `mcp.session.initialized` | `sessionId`, `activeSessions`                                                              |
| `mcp.session.closed`      | `sessionId`, `reason` (client/ttl), `durationMs`, `activeSessions`                         |
| `mcp.tools.listed`        | `sessionId`, `client.name`, `client.version`, `toolCount`                                  |
| `mcp.tool.call`           | `tool`, `outcome` (ok/error), `durationMs`, `status`, `errorType`, `sessionId`, `client.*` |
| `mcp.auth.failed`         | `reason`                                                                                   |

Tool **arguments and results are deliberately never logged** — WiFi passwords, vCard contact
details and email addresses all pass through these tools, and this dataset is retained longer
and read more widely than the API itself.

### Update OpenAPI Spec

Tools are generated from the bundled `src/openapi.json` at startup, so the file must be
refreshed **after** an API change is deployed — a spec ahead of production advertises tools the
API will reject:

```bash
pnpm update-openapi
pnpm build
```

If two operations reduce to the same tool name (e.g. `qr-code/duplicate` and
`template/duplicate` both becoming `duplicate`), startup fails with an explicit error; add an
entry to `TOOL_NAME_OVERRIDES` in `src/openapi-to-mcp.ts`.

## User Documentation

See [MCP Server Guide](https://qrcodly.com/docs/guides/mcp-server) for end-user setup instructions.
