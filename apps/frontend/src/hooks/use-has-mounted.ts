import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False while the server renders and while the page hydrates, true afterwards. For UI that depends
 * on data only the browser has (e.g. a query cache filled by another component before a Suspense
 * boundary hydrates), so the first browser render matches the server's HTML.
 */
export function useHasMounted(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
}
