import {
	ScanDestinationMockup,
	DynamicSwapMockup,
	ScanInsightsMockup,
	PlacementMockup,
	BrandedLinkMockup,
	ApiSnippetMockup,
	LinkListMockup,
} from './UseCaseMockups';
import type { VisualSpec } from '@/lib/use-case-pages';

/** Minimal shape of the next-intl translator the builder needs. */
type Translator = {
	(key: string): string;
	has: (key: string) => boolean;
};

/** Chart geometry is decoration, not copy — it stays out of the dictionaries. */
const BAR_HEIGHTS = [38, 52, 44, 68, 57, 82, 71];
const BREAKDOWN_SHARES = [48, 31, 21];

/**
 * Builds the product mockup for one feature section.
 * Copy lives under `visuals.v{n}.*` in the use case's namespace.
 */
export function buildUseCaseVisual(spec: VisualSpec, t: Translator, index: number) {
	const p = `visuals.v${index + 1}`;
	const key = (name: string) => `${p}.${name}`;
	const tr = (name: string) => t(key(name));
	const optional = (name: string) => (t.has(key(name)) ? t(key(name)) : undefined);

	const common = {
		tone: spec.tone,
		label: tr('label'),
		badge: optional('badge'),
		ariaLabel: tr('aria'),
	};

	switch (spec.kind) {
		case 'scanDestination':
			return (
				<ScanDestinationMockup
					{...common}
					screenTitle={tr('screenTitle')}
					rows={[1, 2, 3].map((n) => ({
						name: tr(`row${n}Name`),
						meta: tr(`row${n}Meta`),
					}))}
				/>
			);

		case 'dynamicSwap':
			return (
				<DynamicSwapMockup
					{...common}
					printedLabel={tr('printedLabel')}
					oldDestination={tr('oldDestination')}
					newDestination={tr('newDestination')}
					footnote={tr('footnote')}
				/>
			);

		case 'insights':
			return (
				<ScanInsightsMockup
					{...common}
					metricValue={tr('metricValue')}
					metricLabel={tr('metricLabel')}
					trend={optional('trend')}
					bars={BAR_HEIGHTS}
					breakdown={[1, 2, 3].map((n, i) => ({
						name: tr(`b${n}Name`),
						share: BREAKDOWN_SHARES[i]!,
					}))}
				/>
			);

		case 'placement':
			return (
				<PlacementMockup
					{...common}
					mediumLabel={tr('mediumLabel')}
					headline={tr('headline')}
					caption={tr('caption')}
				/>
			);

		case 'brandedLink':
			return (
				<BrandedLinkMockup
					{...common}
					genericLink={tr('genericLink')}
					brandedLink={tr('brandedLink')}
					genericNote={tr('genericNote')}
					brandedNote={tr('brandedNote')}
				/>
			);

		case 'apiSnippet':
			return (
				<ApiSnippetMockup
					{...common}
					method={tr('method')}
					endpoint={tr('endpoint')}
					requestLines={[1, 2, 3, 4]
						.filter((n) => t.has(key(`line${n}`)))
						.map((n) => tr(`line${n}`))}
					responseLabel={tr('responseLabel')}
					responseValue={tr('responseValue')}
				/>
			);

		case 'linkList':
			return (
				<LinkListMockup
					{...common}
					rows={[1, 2, 3].map((n) => ({
						link: tr(`r${n}Link`),
						tag: tr(`r${n}Tag`),
						clicks: tr(`r${n}Clicks`),
					}))}
				/>
			);
	}
}
