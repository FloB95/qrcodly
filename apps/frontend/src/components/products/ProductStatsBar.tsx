'use client';

import Container from '@/components/ui/container';
import { AnimateOnScroll } from '@/components/features/AnimateOnScroll';
import { motion } from 'framer-motion';

export function ProductStatsBar({ stats }: { stats: Array<{ value: string; label: string }> }) {
	return (
		<div className="py-16 sm:py-20">
			<Container>
				<div className="sm:px-6 lg:px-8">
					<div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-10 sm:px-10 sm:py-14">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
							{stats.map((stat, i) => (
								<AnimateOnScroll key={stat.label} delay={i * 0.1}>
									<div className="relative text-center">
										{i > 0 && (
											<div className="absolute left-0 top-1/2 -translate-y-1/2 hidden md:block w-px h-12 bg-slate-700/50" />
										)}
										<motion.div
											className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight"
											initial={{ opacity: 0, y: 10 }}
											whileInView={{ opacity: 1, y: 0 }}
											viewport={{ once: true }}
											transition={{ duration: 0.5, delay: i * 0.1 }}
										>
											{stat.value}
										</motion.div>
										<div className="text-sm sm:text-base text-slate-400 mt-2 font-medium">
											{stat.label}
										</div>
									</div>
								</AnimateOnScroll>
							))}
						</div>
					</div>
				</div>
			</Container>
		</div>
	);
}
