import React from 'react';

type NextLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
	href: string | { pathname: string; query?: Record<string, string> };
	replace?: boolean;
	prefetch?: boolean;
	scroll?: boolean;
	children?: React.ReactNode;
};

const Link = React.forwardRef<HTMLAnchorElement, NextLinkProps>(function Link(
	{ href, children, prefetch: _prefetch, scroll: _scroll, replace: _replace, ...rest },
	ref,
) {
	const url = typeof href === 'string' ? href : href.pathname;

	// All links open in a new tab from the extension popup
	return (
		<a ref={ref} href={url} target="_blank" rel="noopener noreferrer" {...rest}>
			{children}
		</a>
	);
});

export default Link;
