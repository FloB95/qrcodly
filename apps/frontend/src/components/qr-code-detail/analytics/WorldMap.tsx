'use client';

import { useState, useMemo, memo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { geoCylindricalStereographic } from 'd3-geo-projection';
import { alpha2ToNumeric } from 'i18n-iso-countries';
import geoData from '../../../../public/geo/countries-110m.json';

const MAP_WIDTH = 800;
const MAP_HEIGHT = 450;

const projection = geoCylindricalStereographic()
	.parallel(30)
	.translate([MAP_WIDTH / 2, MAP_HEIGHT / 1.8])
	.scale(140);

interface CountryDataItem {
	code: string;
	label: string;
	count: number;
}

interface WorldMapProps {
	data: CountryDataItem[];
}

interface TooltipState {
	content: string;
	x: number;
	y: number;
}

export const WorldMap = memo(({ data }: WorldMapProps) => {
	const [tooltip, setTooltip] = useState<TooltipState | null>(null);

	const { countryMap, maxCount } = useMemo(() => {
		const map = new Map<string, CountryDataItem>();
		let max = 0;
		for (const item of data) {
			const numericCode = alpha2ToNumeric(item.code.toUpperCase());
			if (numericCode) {
				map.set(String(numericCode), item);
				if (item.count > max) max = item.count;
			}
		}
		return { countryMap: map, maxCount: max };
	}, [data]);

	return (
		<div className="relative rounded-lg bg-muted/30 mb-4">
			<ComposableMap
				width={MAP_WIDTH}
				height={MAP_HEIGHT}
				projection={projection}
				style={{ width: '100%', height: 'auto' }}
			>
				<Geographies geography={geoData}>
					{({ geographies }) =>
						geographies
							.filter((geo) => geo.id !== '010')
							.map((geo) => {
								const country = countryMap.get(String(geo.id));
								const hasData = !!country && country.count > 0;
								const t = hasData && maxCount > 0 ? country.count / maxCount : 0;
								const opacity = hasData ? 0.25 + t * 0.75 : 0.1;

								return (
									<Geography
										key={geo.rsmKey}
										geography={geo}
										style={{
											default: {
												fill: hasData ? 'var(--chart-1)' : 'var(--muted-foreground)',
												fillOpacity: opacity,
												stroke: 'var(--background)',
												strokeWidth: 0.5,
												outline: 'none',
											},
											hover: {
												fill: hasData ? 'var(--chart-1)' : 'var(--muted-foreground)',
												fillOpacity: hasData ? 1 : 0.15,
												stroke: 'var(--background)',
												strokeWidth: 0.5,
												outline: 'none',
												cursor: hasData ? 'pointer' : 'default',
											},
											pressed: { outline: 'none' },
										}}
										onMouseMove={(e: React.MouseEvent) => {
											if (country) {
												setTooltip({
													content: `${country.label}: ${country.count.toLocaleString()}`,
													x: e.clientX,
													y: e.clientY,
												});
											}
										}}
										onMouseLeave={() => setTooltip(null)}
									/>
								);
							})
					}
				</Geographies>
			</ComposableMap>
			{tooltip && (
				<div
					className="fixed z-50 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md pointer-events-none"
					style={{ left: tooltip.x + 12, top: tooltip.y - 32 }}
				>
					{tooltip.content}
				</div>
			)}
		</div>
	);
});
WorldMap.displayName = 'WorldMap';
