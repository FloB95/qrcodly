import { useMemo } from 'react';
import {
	useLocation,
	useNavigate,
	useParams as useRouterParams,
	useSearchParams as useRouterSearchParams,
} from 'react-router-dom';

export function usePathname(): string {
	return useLocation().pathname;
}

export function useSearchParams(): URLSearchParams {
	const [searchParams] = useRouterSearchParams();
	return searchParams;
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
	return useRouterParams() as T;
}

export function useRouter() {
	const navigate = useNavigate();

	return useMemo(
		() => ({
			push(href: string, _options?: Record<string, unknown>) {
				// Strip locale prefix
				const stripped = href.replace(/^\/(?:en|de|nl|fr|it|es|pl|ru)(\/|$)/, '/');
				navigate(stripped);
			},
			replace(href: string, _options?: Record<string, unknown>) {
				const stripped = href.replace(/^\/(?:en|de|nl|fr|it|es|pl|ru)(\/|$)/, '/');
				navigate(stripped, { replace: true });
			},
			back() {
				navigate(-1);
			},
			forward() {
				navigate(1);
			},
			refresh() {
				navigate(0);
			},
			prefetch() {
				// no-op in desktop
			},
		}),
		[navigate],
	);
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
