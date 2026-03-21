declare module 'react-simple-maps' {
	import type { ComponentType, ReactNode, CSSProperties } from 'react';

	interface ProjectionConfig {
		scale?: number;
		center?: [number, number];
		rotate?: [number, number, number];
	}

	interface GeographyStyleObj {
		default?: CSSProperties;
		hover?: CSSProperties;
		pressed?: CSSProperties;
	}

	interface GeographyType {
		rsmKey: string;
		id: string;
		properties: Record<string, unknown>;
	}

	export const ComposableMap: ComponentType<{
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		projection?: string | any;
		projectionConfig?: ProjectionConfig;
		width?: number;
		height?: number;
		style?: CSSProperties;
		children?: ReactNode;
	}>;

	export const Geographies: ComponentType<{
		geography: string | Record<string, unknown>;
		children: (data: { geographies: GeographyType[] }) => ReactNode;
	}>;

	export const Geography: ComponentType<{
		geography: GeographyType;
		style?: GeographyStyleObj;
		fill?: string;
		stroke?: string;
		strokeWidth?: number;
		onMouseEnter?: (event: React.MouseEvent) => void;
		onMouseLeave?: (event: React.MouseEvent) => void;
		onMouseMove?: (event: React.MouseEvent) => void;
		onClick?: (event: React.MouseEvent) => void;
	}>;

	export const ZoomableGroup: ComponentType<{
		center?: [number, number];
		zoom?: number;
		minZoom?: number;
		maxZoom?: number;
		children?: ReactNode;
	}>;
}
