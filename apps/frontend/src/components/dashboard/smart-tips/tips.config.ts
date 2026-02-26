export type TipCondition =
	| {
			type: 'behavior';
			action: string;
			minCount: number;
			windowMs: number;
	  }
	| {
			type: 'state';
			evaluate: (ctx: SmartTipStateContext) => boolean;
	  };

export type SmartTipStateContext = {
	totalQrCodes?: number;
	totalTags?: number;
	hasDynamicQr?: boolean;
	hasCustomDomain?: boolean;
	hasProPlan?: boolean;
};

export type TipDefinition = {
	id: string;
	i18nKey: string;
	anchor: string;
	condition: TipCondition;
	maxShowCount: number;
	cooldownDays: number;
	priority: number;
	/** Minimum milliseconds the component must be mounted before this tip can appear */
	delayMs?: number;
	/** Probability (0-1) that the tip shows when conditions are met. Rolled once per mount. */
	probability?: number;
};

export const tips: TipDefinition[] = [
	{
		id: 'bulk-export',
		i18nKey: 'bulkExport',
		anchor: 'actions-button',
		condition: {
			type: 'behavior',
			action: 'qr-download',
			minCount: 2,
			windowMs: 60_000,
		},
		maxShowCount: 3,
		cooldownDays: 14,
		priority: 1,
	},
	{
		id: 'bulk-import',
		i18nKey: 'bulkImport',
		anchor: 'actions-button',
		condition: {
			type: 'behavior',
			action: 'qr-create',
			minCount: 3,
			windowMs: 5 * 60_000,
		},
		maxShowCount: 3,
		cooldownDays: 14,
		priority: 2,
	},
	{
		id: 'custom-domain',
		i18nKey: 'customDomain',
		anchor: 'dynamic-url',
		condition: {
			type: 'state',
			evaluate: (ctx) =>
				(ctx.hasDynamicQr ?? false) &&
				!(ctx.hasCustomDomain ?? false) &&
				!(ctx.hasProPlan ?? false),
		},
		maxShowCount: 2,
		cooldownDays: 14,
		priority: 3,
		delayMs: 70_000,
		probability: 0.5,
	},
	{
		id: 'organize-tags',
		i18nKey: 'organizeTags',
		anchor: 'tags-filter',
		condition: {
			type: 'state',
			evaluate: (ctx) => (ctx.totalQrCodes ?? 0) >= 10 && (ctx.totalTags ?? 0) === 0,
		},
		maxShowCount: 2,
		cooldownDays: 14,
		priority: 4,
	},
];
