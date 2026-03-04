import React, { Suspense, lazy } from 'react';

type DynamicOptions = {
	loading?: () => React.ReactNode;
	ssr?: boolean;
};

export default function dynamic<P extends object>(
	importFn: () => Promise<{ default: React.ComponentType<P> }>,
	options?: DynamicOptions,
): React.ComponentType<P> {
	const LazyComponent = lazy(importFn);
	const fallback = options?.loading ? React.createElement(options.loading) : null;

	const DynamicComponent = (props: P) => (
		<Suspense fallback={fallback}>
			<LazyComponent {...props} />
		</Suspense>
	);

	DynamicComponent.displayName = 'DynamicComponent';
	return DynamicComponent;
}
