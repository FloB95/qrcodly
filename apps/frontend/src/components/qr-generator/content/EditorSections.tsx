'use client';

import { Children, createContext, isValidElement, useContext, useRef, type ReactNode } from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ArrowDownIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import type { THostedPageType } from '@shared/schemas';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type EditorSectionsProps = {
	/** Page type the editor belongs to, for analytics */
	type: THostedPageType;
	/** The open section, at most one; kept as a list for the callers' state */
	value: string[];
	onValueChange: (value: string[]) => void;
	children: ReactNode;
};

// the accordion's own collapse animation lasts 200 ms
const SETTLE_MS = 320;

const sectionHeader = (value: string) =>
	document.querySelector<HTMLElement>(`[data-editor-section="${CSS.escape(value)}"]`);

function scrollParent(element: HTMLElement): HTMLElement {
	for (let node = element.parentElement; node; node = node.parentElement) {
		const { overflowY } = getComputedStyle(node);
		if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
			return node;
		}
	}
	return document.scrollingElement as HTMLElement;
}

/**
 * Keeps an element where it is on screen while the layout above it changes, frame by frame, so
 * a section closing above the one just opened does not pull the clicked header out of view.
 */
function holdInPlace(element: HTMLElement) {
	const top = element.getBoundingClientRect().top;
	const scroller = scrollParent(element);
	const until = performance.now() + SETTLE_MS;
	const step = () => {
		const drift = element.getBoundingClientRect().top - top;
		if (Math.abs(drift) >= 1) scroller.scrollTop += drift;
		if (performance.now() < until) requestAnimationFrame(step);
	};
	requestAnimationFrame(step);
}

type SectionsContext = {
	next: (value: string) => { value: string; title: string } | null;
	goTo: (value: string) => void;
};
const EditorSectionsContext = createContext<SectionsContext | null>(null);

/**
 * A long editor split into steps; one is open at a time, so the page stays short. Each step says in
 * its header what it holds or what is still missing, so the whole page can be read with every step
 * closed.
 */
export function EditorSections({ type, value, onValueChange, children }: EditorSectionsProps) {
	const order = Children.toArray(children).flatMap((child) =>
		isValidElement<EditorSectionProps>(child) && child.props.value
			? [{ value: child.props.value, title: child.props.title }]
			: [],
	);
	const valueRef = useRef(value);
	valueRef.current = value;

	const open = (section: string | null) => {
		if (section) posthog.capture('hosted-editor:section-opened', { type, section });
		onValueChange(section ? [section] : []);
	};
	const change = (next: string[]) => {
		const opened = next.find((section) => !valueRef.current.includes(section));
		if (!opened) {
			open(null);
			return;
		}
		// the header just clicked stays under the pointer while the open one closes
		const header = sectionHeader(opened);
		if (header) holdInPlace(header);
		open(opened);
	};
	const context: SectionsContext = {
		next: (current) => order[order.findIndex((entry) => entry.value === current) + 1] ?? null,
		// "next" closes the step it sits in, then brings the following step's header to the top
		goTo: (section) => {
			open(section);
			window.setTimeout(
				() => sectionHeader(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
				SETTLE_MS,
			);
		},
	};

	return (
		<EditorSectionsContext.Provider value={context}>
			<AccordionPrimitive.Root
				type="multiple"
				value={value}
				onValueChange={change}
				className="divide-y overflow-hidden rounded-xl border bg-white/60"
			>
				{children}
			</AccordionPrimitive.Root>
		</EditorSectionsContext.Provider>
	);
}

type EditorSectionProps = {
	value: string;
	step: number;
	title: string;
	/** One line under the title: what the step holds, or what is missing */
	summary?: string;
	/** Required input is missing; the summary then names it */
	missing?: boolean;
	/** Everything required is filled in */
	complete?: boolean;
	children: ReactNode;
};

export function EditorSection({
	value,
	step,
	title,
	summary,
	missing,
	complete,
	children,
}: EditorSectionProps) {
	const t = useTranslations('generator.contentSwitch.hosted');
	const sections = useContext(EditorSectionsContext);
	const next = sections?.next(value) ?? null;

	return (
		<AccordionPrimitive.Item value={value} className="group/section">
			<AccordionPrimitive.Header data-editor-section={value} className="scroll-mt-24">
				<AccordionPrimitive.Trigger className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white data-[state=open]:bg-white">
					<span
						className={cn(
							'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
							complete
								? 'bg-teal-600 text-white'
								: missing
									? 'border border-amber-500 text-amber-700'
									: 'border border-border text-muted-foreground',
						)}
						aria-hidden="true"
					>
						{complete ? <CheckIcon className="size-4" strokeWidth={2.5} /> : step}
					</span>
					<span className="min-w-0 flex-1">
						<span className="block text-sm font-semibold">{title}</span>
						{summary && (
							<span
								className={cn(
									'block truncate text-xs',
									missing ? 'text-amber-700' : 'text-muted-foreground',
								)}
							>
								{summary}
							</span>
						)}
					</span>
					<ChevronDownIcon
						className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/section:rotate-180"
						aria-hidden="true"
					/>
				</AccordionPrimitive.Trigger>
			</AccordionPrimitive.Header>
			<AccordionPrimitive.Content className="overflow-hidden bg-white data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
				<div className="space-y-5 px-4 pt-1 pb-5">
					{children}
					{next && (
						<div className="flex justify-end border-t pt-5">
							<Button
								type="button"
								size="sm"
								className="h-auto max-w-full gap-2 rounded-xl px-4 py-2 text-left whitespace-normal"
								onClick={() => sections?.goTo(next.value)}
							>
								{t('nextStep', { step: next.title })}
								<ArrowDownIcon className="size-4 shrink-0" aria-hidden="true" />
							</Button>
						</div>
					)}
				</div>
			</AccordionPrimitive.Content>
		</AccordionPrimitive.Item>
	);
}
