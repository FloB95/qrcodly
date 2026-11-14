// Shim for @react-google-maps/api — the Maps JS API is remotely hosted code, which MV3 forbids.
// Without it the location address is plain text input (no autocomplete, no coordinates).
import type { ReactNode } from 'react';

export type Libraries = string[];

export function useJsApiLoader() {
	return { isLoaded: true, loadError: undefined };
}

export function StandaloneSearchBox({ children }: { children: ReactNode }) {
	return children;
}
