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

| Variable               | Default                  | Description          |
| ---------------------- | ------------------------ | -------------------- |
| `QRCODLY_API_BASE_URL` | `https://api.qrcodly.de` | QRcodly API base URL |
| `PORT`                 | `3002`                   | Server port          |
| `HOST`                 | `0.0.0.0`                | Server host          |

### Update OpenAPI Spec

```bash
pnpm update-openapi
```

## User Documentation

See [MCP Server Guide](https://qrcodly.com/docs/guides/mcp-server) for end-user setup instructions.
