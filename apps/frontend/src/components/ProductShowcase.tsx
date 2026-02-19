'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Container from './ui/container';

export function ProductShowcase() {
	const t = useTranslations('productShowcase');

	return (
		<Container className="overflow-visible">
			<div className="text-center mb-12 sm:mb-16 px-4 sm:px-6">
				<motion.h2
					className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900"
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
				>
					{t('headline')}
				</motion.h2>
				<motion.p
					className="mt-6 text-xl sm:text-2xl text-slate-600 max-w-2xl mx-auto"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.15 }}
				>
					{t('description')}
				</motion.p>
			</div>

			{/* Browser mockup */}
			<motion.div
				className="mx-auto px-4 sm:px-6 pb-4"
				initial={{ opacity: 0, y: 40, rotateX: 5 }}
				whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6, delay: 0.2 }}
				style={{ perspective: 1000 }}
			>
				<div className="rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
					{/* Browser chrome */}
					<div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
						<div className="flex gap-1.5">
							<div className="w-3 h-3 rounded-full bg-red-400" />
							<div className="w-3 h-3 rounded-full bg-yellow-400" />
							<div className="w-3 h-3 rounded-full bg-green-400" />
						</div>
						<div className="flex-1 flex justify-center">
							<div className="bg-white rounded-md border border-gray-200 px-4 py-1 text-xs text-gray-500 min-w-[200px] text-center">
								app.qrcodly.de/dashboard
							</div>
						</div>
					</div>
					{/* Screenshot */}
					<div className="relative aspect-[16/9] bg-gradient-to-br from-slate-50 to-slate-100">
						<Image
							src="/images/dashboard-mockup.png"
							alt="QRcodly Dashboard showing QR code management interface"
							fill
							className="object-cover object-top"
							sizes="(max-width: 1024px) 100vw, 1024px"
							loading="lazy"
						/>
					</div>
				</div>
			</motion.div>
		</Container>
	);
}
