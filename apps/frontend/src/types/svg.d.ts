// filepath: src/types/svg.d.ts
declare module '*.svg' {
	import type * as React from 'react';
	const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
	export default ReactComponent;
}
