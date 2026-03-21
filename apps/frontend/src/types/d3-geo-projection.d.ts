declare module 'd3-geo-projection' {
	interface GeoProjection {
		(point: [number, number]): [number, number] | null;
		translate(point: [number, number]): this;
		scale(scale: number): this;
		center(center: [number, number]): this;
		rotate(angles: [number, number] | [number, number, number]): this;
		parallel(parallel: number): this;
		clipExtent(extent: [[number, number], [number, number]] | null): this;
	}

	export function geoCylindricalStereographic(): GeoProjection;
}
