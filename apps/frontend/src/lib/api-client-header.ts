// The web app sends no client header: session tokens without one already count as `web`, and it
// keeps web deploys independent of the backend's CORS config. The browser extension and the
// desktop app alias this module to their own shim.
export const API_CLIENT: string | null = null;
