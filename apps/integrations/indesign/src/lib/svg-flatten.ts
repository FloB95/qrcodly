/**
 * Rewrites qr-code-styling SVG output so it renders in UXP.
 *
 * The library emits:
 *   <defs>
 *     <clipPath id="dots">
 *       <path .../> <circle .../> <rect .../>
 *     </clipPath>
 *   </defs>
 *   <rect clip-path="url(#dots)" fill="#000"/>
 *
 * UXP's SVG renderer does not honour `clip-path="url(#id)"` references, so
 * the rect floods the canvas instead of being clipped to each QR module.
 * InDesign itself renders this fine — this transform exists purely for the
 * in-panel preview.
 *
 * After flattening, each shape is output directly with its intended fill:
 *   <path fill="#000" .../> <circle fill="#000" .../>
 *   <rect fill="#000" .../>
 */
export function flattenClipPathRefs(svg: string): string {
	const clipPaths: Record<string, string> = {};

	const clipPathRegex = /<clipPath\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/clipPath>/g;
	for (const match of svg.matchAll(clipPathRegex)) {
		clipPaths[match[1]] = match[2];
	}

	if (Object.keys(clipPaths).length === 0) return svg;

	const expanded = svg.replace(/<rect\b([^>]*?)\/>/g, (full, rawAttrs: string) => {
		const clipMatch = rawAttrs.match(
			/clip-path\s*=\s*["']url\(\s*['"]?#([^'"\)\s]+)['"]?\s*\)["']/i,
		);
		if (!clipMatch) return full;

		const children = clipPaths[clipMatch[1]];
		if (!children) return full;

		const fillMatch = rawAttrs.match(/\bfill\s*=\s*["']([^"']*)["']/i);
		const fill = fillMatch?.[1];
		if (!fill) return children;

		// Apply the parent rect's fill to each shape that didn't already set one.
		return children.replace(
			/<(path|rect|circle|ellipse|polygon|polyline)\b([^>]*?)\s*\/?>/g,
			(childFull, tag: string, childAttrs: string) => {
				if (/\bfill\s*=/i.test(childAttrs)) return childFull;
				return `<${tag}${childAttrs} fill="${fill}"/>`;
			},
		);
	});

	// Drop the now-unused <defs> block.
	return expanded.replace(/<defs>[\s\S]*?<\/defs>/g, '');
}
