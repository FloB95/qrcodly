// Shim for next/navigation — simple stubs for the browser extension popup

export function usePathname(): string {
	return '/';
}

export function useSearchParams(): URLSearchParams {
	return new URLSearchParams();
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
	return {} as T;
}

export function useRouter() {
	return {
		push(href: string) {
			window.open(href, '_blank');
		},
		replace(href: string) {
			window.open(href, '_blank');
		},
		back() {
			// no-op in extension
		},
		forward() {
			// no-op in extension
		},
		refresh() {
			window.location.reload();
		},
		prefetch() {
			// no-op in extension
		},
	};
}

export function notFound(): never {
	throw new Response('Not Found', { status: 404 });
}

export function redirect(url: string): never {
	throw new Response('', {
		status: 302,
		headers: { Location: url },
	});
}
