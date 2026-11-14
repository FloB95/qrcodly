'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	HOSTED_PAGE_DEFAULT_PRIMARY_COLOR,
	HOSTED_PAGE_FONTS,
	HOSTED_PAGE_MODES,
	HOSTED_PAGE_STYLE_PRESETS,
	HOSTED_PAGE_STYLES,
	getStylePresetTheme,
	type THostedPageStyle,
	type THostedPageTheme,
} from '@shared/schemas';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { hostedFontVariables } from '@/components/hosted-page/fonts';
import { HOSTED_FONT_LABELS } from '@/components/hosted-page/font-labels';
import { FONT_PAIR_CLASS } from '@/components/hosted-page/theme';

export type HostedPageDesign = {
	theme?: THostedPageTheme;
	hideBranding?: boolean;
};

type HostedPageDesignFieldsProps = {
	value: HostedPageDesign;
	onChange: (next: HostedPageDesign) => void;
	disabled?: boolean;
};

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/** True when the owner has not touched the colours and font of the current style. */
function isUntouched(theme: THostedPageTheme): boolean {
	const style = theme.style ?? 'editorial';
	const preset = HOSTED_PAGE_STYLE_PRESETS[style];
	const colorsDefault =
		(theme.primaryColor === preset.primaryColor &&
			(theme.accentColor ?? preset.accentColor) === preset.accentColor) ||
		(theme.primaryColor === HOSTED_PAGE_DEFAULT_PRIMARY_COLOR && !theme.accentColor);
	return colorsDefault && (!theme.font || theme.font === preset.font);
}

/** Curated looks and two colours: enough to make the page theirs, never enough to break it. */
export function HostedPageDesignFields({ value, onChange, disabled }: HostedPageDesignFieldsProps) {
	const t = useTranslations('generator.contentSwitch.hosted.design');
	const theme: THostedPageTheme = value.theme ?? getStylePresetTheme('editorial');
	const setTheme = (patch: Partial<THostedPageTheme>) =>
		onChange({ ...value, theme: { ...theme, ...patch } });

	const chooseStyle = (style: THostedPageStyle) => {
		// a style comes with its own palette and pairing unless the owner already customised them
		const next = isUntouched(theme)
			? { ...getStylePresetTheme(style), mode: theme.mode ?? HOSTED_PAGE_STYLE_PRESETS[style].mode }
			: { ...theme, style };
		onChange({ ...value, theme: next });
	};

	const colorField = (key: 'primaryColor' | 'accentColor', label: string, id: string) => {
		const current = theme[key] ?? theme.primaryColor;
		const set = (next: string) => setTheme({ [key]: next.toLowerCase() });
		return (
			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<Label htmlFor={id} className="text-sm">
					{label}
				</Label>
				<div className="flex items-center gap-2">
					<input
						id={id}
						type="color"
						value={current}
						disabled={disabled}
						onChange={(e) => set(e.target.value)}
						className="size-9 cursor-pointer rounded-md border bg-white p-0.5 disabled:cursor-not-allowed"
					/>
					<HexInput value={current} onCommit={set} disabled={disabled} label={label} />
				</div>
			</div>
		);
	};

	const currentFont = theme.font ?? HOSTED_PAGE_STYLE_PRESETS[theme.style ?? 'editorial'].font;

	return (
		<div
			className={cn('@container space-y-5 rounded-xl border bg-white/60 p-4', hostedFontVariables)}
		>
			<p className="text-sm font-medium">{t('title')}</p>

			<div className="space-y-2">
				<Label className="text-sm">{t('style.label')}</Label>
				<div role="radiogroup" aria-label={t('style.label')} className="grid gap-2 @md:grid-cols-3">
					{HOSTED_PAGE_STYLES.map((style) => {
						const active = (theme.style ?? 'editorial') === style;
						const preset = HOSTED_PAGE_STYLE_PRESETS[style];
						return (
							<button
								key={style}
								type="button"
								role="radio"
								aria-checked={active}
								disabled={disabled}
								onClick={() => chooseStyle(style)}
								className={cn(
									'cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
									active
										? 'border-slate-900 bg-white shadow-sm'
										: 'border-border bg-white/60 hover:bg-white',
								)}
							>
								<span className="flex items-center gap-2">
									<span className="flex -space-x-1">
										<span
											className="size-3.5 rounded-full ring-1 ring-white"
											style={{ backgroundColor: preset.primaryColor }}
										/>
										<span
											className="size-3.5 rounded-full ring-1 ring-white"
											style={{ backgroundColor: preset.accentColor }}
										/>
									</span>
									<span className="text-sm font-medium">{t(`style.${style}.title`)}</span>
								</span>
								<span className="mt-1 block text-xs text-muted-foreground">
									{t(`style.${style}.description`)}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<Label className="text-sm">{t('font.label')}</Label>
				<Select
					value={currentFont}
					onValueChange={(font) => setTheme({ font: font as THostedPageTheme['font'] })}
					disabled={disabled}
				>
					<SelectTrigger className="w-56" aria-label={t('font.label')}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent className={hostedFontVariables}>
						{HOSTED_PAGE_FONTS.map((font) => (
							<SelectItem key={font} value={font}>
								<span
									className={cn('font-hp-display text-[15px] leading-5', FONT_PAIR_CLASS[font])}
								>
									{HOSTED_FONT_LABELS[font].display}
								</span>
								<span className="ml-2 text-xs text-muted-foreground">
									+ {HOSTED_FONT_LABELS[font].body}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
				<Label className="text-sm">{t('mode.label')}</Label>
				<div
					role="radiogroup"
					aria-label={t('mode.label')}
					className="inline-flex rounded-md border bg-white p-0.5"
				>
					{HOSTED_PAGE_MODES.map((mode) => {
						const active = (theme.mode ?? 'light') === mode;
						return (
							<button
								key={mode}
								type="button"
								role="radio"
								aria-checked={active}
								disabled={disabled}
								onClick={() => setTheme({ mode })}
								className={cn(
									'cursor-pointer rounded px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
									active
										? 'bg-slate-900 text-white'
										: 'text-muted-foreground hover:text-foreground',
								)}
							>
								{t(`mode.${mode}`)}
							</button>
						);
					})}
				</div>
			</div>

			{colorField('primaryColor', t('primaryColor'), 'hosted-primary-color')}
			{colorField('accentColor', t('accentColor'), 'hosted-accent-color')}

			<div className="flex items-center justify-between gap-4">
				<Label htmlFor="hosted-hide-branding" className="text-sm">
					{t('hideBranding')}
				</Label>
				<Switch
					id="hosted-hide-branding"
					checked={value.hideBranding === true}
					disabled={disabled}
					onCheckedChange={(checked) => onChange({ ...value, hideBranding: checked })}
				/>
			</div>
		</div>
	);
}

/** Typing a colour passes through invalid states ("#1e"), so the text lives here until it is a colour. */
function HexInput({
	value,
	onCommit,
	disabled,
	label,
}: {
	value: string;
	onCommit: (hex: string) => void;
	disabled?: boolean;
	label: string;
}) {
	const [draft, setDraft] = useState(value);
	const [synced, setSynced] = useState(value);
	if (synced !== value) {
		setSynced(value);
		setDraft(value);
	}
	return (
		<Input
			value={draft}
			disabled={disabled}
			maxLength={7}
			onChange={(e) => {
				setDraft(e.target.value);
				if (HEX_PATTERN.test(e.target.value)) onCommit(e.target.value);
			}}
			onBlur={() => setDraft(value)}
			className="w-28 font-mono text-sm"
			aria-label={label}
		/>
	);
}
