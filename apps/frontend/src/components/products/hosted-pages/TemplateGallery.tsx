import { getTranslations } from 'next-intl/server';
import { EyeIcon } from '@heroicons/react/24/outline';
import { getTemplateTheme, type THostedPageTemplateId } from '@shared/schemas';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { TemplatePhone } from './TemplatePhone';
import { demoPath, templateTypeOf } from './template-sample';

/**
 * Templates as cards in their own colours: the whole phone floats on the template's tone, with
 * name, look and the two ways on — the live demo or the editor with the template picked.
 */
export async function TemplateGallery({
	locale,
	templates,
	className,
}: {
	locale: string;
	templates: THostedPageTemplateId[];
	className?: string;
}) {
	const t = await getTranslations({ locale, namespace: 'hostedDemo.gallery' });
	const tTemplates = await getTranslations({
		locale,
		namespace: 'generator.contentSwitch.hosted.templates',
	});

	return (
		<ul className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2', className)}>
			{templates.map((id) => {
				const name = tTemplates(`${id}.name`);
				const { primaryColor, accentColor } = getTemplateTheme(id);
				return (
					<li
						key={id}
						className="group relative isolate flex flex-col items-center overflow-hidden rounded-[28px] px-6 pt-8 pb-6 text-white"
						style={{
							// darkened template colours keep white text readable on every template
							background: `radial-gradient(120% 70% at 85% 0%, color-mix(in oklch, ${accentColor} 45%, transparent), transparent 60%), linear-gradient(165deg, color-mix(in oklch, ${primaryColor} 80%, black), color-mix(in oklch, ${primaryColor} 45%, black))`,
						}}
					>
						<div className="relative">
							<TemplatePhone
								locale={locale}
								template={id}
								scale={0.5}
								className="h-[440px] w-[220px] rounded-[36px] p-2 shadow-[0_40px_60px_-30px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.08)] transition duration-500 group-hover:-translate-y-2 group-hover:-rotate-2"
							/>
							{/* a layer, not a wrapper: the page in the phone has links of its own */}
							<Link
								href={demoPath(id)}
								aria-label={t('openDemo', { name })}
								className="absolute inset-0 rounded-[36px]"
							/>
						</div>
						<div className="mt-7 flex w-full flex-1 flex-col gap-1">
							<h3 className="text-xl font-bold tracking-tight">{name}</h3>
							<p className="text-sm leading-relaxed text-white/70">
								{tTemplates(`${id}.description`)}
							</p>
							<div className="mt-auto flex flex-wrap gap-2 pt-5">
								<Link
									href={demoPath(id)}
									className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/90"
								>
									<EyeIcon className="size-4" aria-hidden="true" />
									{t('demo')}
								</Link>
								<Link
									href={`/?type=${templateTypeOf(id)}&template=${id}#generator`}
									className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40 transition ring-inset hover:bg-white/10"
								>
									{t('use')}
								</Link>
							</div>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
