import { getTranslations } from 'next-intl/server';
import type { THostedPageTemplateId } from '@shared/schemas';
import { cn } from '@/lib/utils';
import { HostedPageView } from '@/components/hosted-page/registry';
import { samplePage } from './template-sample';

type TemplatePhoneProps = {
	locale: string;
	template: THostedPageTemplateId;
	/** Rendered width of the page inside the frame; it is scaled down to fit */
	scale?: number;
	className?: string;
};

/**
 * A hosted page template as visitors see it, in a phone frame: the real page component with the
 * template's sample content, so the marketing page never drifts from the product.
 */
export async function TemplatePhone({
	locale,
	template,
	scale = 1,
	className,
}: TemplatePhoneProps) {
	const t = await getTranslations({
		locale,
		namespace: 'generator.contentSwitch.hosted.templates',
	});
	const page = samplePage(template, t);
	if (!page) return null;

	return (
		<div
			className={cn(
				'isolate rounded-[44px] bg-[#0b0f17] p-3 shadow-[0_50px_90px_-40px_rgba(15,23,42,0.75)]',
				className,
			)}
			aria-hidden="true"
		>
			<div className="pointer-events-none h-full overflow-hidden rounded-[34px]">
				<div
					className="flex min-h-full origin-top-left flex-col"
					style={{ transform: `scale(${scale})`, width: `${100 / scale}%` }}
				>
					<HostedPageView page={page} preview />
				</div>
			</div>
		</div>
	);
}
