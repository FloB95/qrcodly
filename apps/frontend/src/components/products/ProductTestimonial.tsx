'use client';

import Image from 'next/image';
import Container from '@/components/ui/container';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';

export type Testimonial = {
	/** Opening sentences, rendered large. Verbatim — never paraphrase a named person. */
	quoteLead: string;
	/** Remainder of the same quote, in reading order. */
	quoteRest: string;
	authorName: string;
	authorRole: string;
	companyLogo?: { src: string; alt: string; width: number; height: number };
	companyUrl?: string;
};

export function ProductTestimonial({
	eyebrow,
	testimonial,
}: {
	eyebrow?: string;
	testimonial: Testimonial;
}) {
	const { quoteLead, quoteRest, authorName, authorRole, companyLogo, companyUrl } = testimonial;

	const logo = companyLogo ? (
		<Image
			src={companyLogo.src}
			alt={companyLogo.alt}
			width={companyLogo.width}
			height={companyLogo.height}
			// Vector logo — the optimizer rejects SVG unless dangerouslyAllowSVG is enabled.
			unoptimized
			className="h-9 w-auto"
		/>
	) : null;

	return (
		<div className="py-16 sm:py-24">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<AnimateOnScroll className="max-w-4xl mx-auto p-px rounded-2xl bg-gradient-to-r from-[#f4f4f5] to-[#fddfbc]">
						<figure className="rounded-[15px] bg-gradient-to-r from-white to-[#fff3e6] px-6 py-10 sm:px-12 sm:py-14">
							{eyebrow && (
								<figcaption className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-6 text-center">
									{eyebrow}
								</figcaption>
							)}

							<blockquote>
								<p className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-slate-900 text-center leading-snug text-balance">
									&ldquo;{quoteLead}
								</p>
								<p className="mt-5 text-slate-600 text-base sm:text-lg leading-relaxed text-center max-w-2xl mx-auto">
									{quoteRest}&rdquo;
								</p>
							</blockquote>

							<div className="mt-8 flex flex-col items-center gap-4">
								{companyLogo &&
									(companyUrl ? (
										<a
											href={companyUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="transition-opacity hover:opacity-70"
										>
											{logo}
										</a>
									) : (
										logo
									))}
								<div className="text-center">
									<div className="text-sm font-semibold text-slate-900">{authorName}</div>
									<div className="text-sm text-slate-500">{authorRole}</div>
								</div>
							</div>
						</figure>
					</AnimateOnScroll>
				</div>
			</Container>
		</div>
	);
}
