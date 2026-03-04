import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

type NextLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
	href: string | { pathname: string; query?: Record<string, string> };
	replace?: boolean;
	prefetch?: boolean;
	scroll?: boolean;
	children?: React.ReactNode;
};

const Link = React.forwardRef<HTMLAnchorElement, NextLinkProps>(function Link(
	{ href, replace, children, prefetch: _prefetch, scroll: _scroll, ...rest },
	ref,
) {
	const url = typeof href === 'string' ? href : href.pathname;

	// External links → native <a>
	if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
		return (
			<a ref={ref} href={url} target="_blank" rel="noopener noreferrer" {...rest}>
				{children}
			</a>
		);
	}

	// Strip locale prefix if present (e.g. /en/dashboard/... → /dashboard/...)
	const stripped = url.replace(/^\/(?:en|de|nl|fr|it|es|pl|ru)(\/|$)/, '/');

	return (
		<RouterLink ref={ref} to={stripped} replace={replace} {...rest}>
			{children}
		</RouterLink>
	);
});

export default Link;
