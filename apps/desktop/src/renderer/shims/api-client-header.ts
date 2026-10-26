// Shim for @/lib/api-client-header
import { formatApiClientHeader } from '@shared/schemas';

export const API_CLIENT = formatApiClientHeader('desktop', __APP_VERSION__);
