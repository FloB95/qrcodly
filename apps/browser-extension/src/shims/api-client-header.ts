// Shim for @/lib/api-client-header
import { formatApiClientHeader } from '@shared/schemas';

export const API_CLIENT = formatApiClientHeader('browser-extension', __APP_VERSION__);
