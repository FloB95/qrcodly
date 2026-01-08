/**
 * Predefined background images for QR preview
 * Includes sample images showing typical QR code placement scenarios
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';

interface PredefinedBackgroundsProps {
	onSelect: (imageUrl: string) => void;
	className?: string;
}

// Predefined background categories with sample images
const BACKGROUND_CATEGORIES = [
	{
		id: 'business-cards',
		labelKey: 'businessCards',
		images: [
			{
				url: 'https://plus.unsplash.com/premium_photo-1726754742476-915c95b6ed4d?q=80&w=2242&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
				alt: 'Minimal business card on desk with free space',
			},
			{
				url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200&fit=max',
				alt: 'Blank business card mockup',
			},
		],
	},
	{
		id: 'flyers-posters',
		labelKey: 'flyersAndPosters',
		images: [
			{
				url: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=1200&fit=max',
				alt: 'Minimal poster on wall with empty space',
			},
			{
				url: 'https://images.unsplash.com/photo-1529336953121-ad3ef6b7b5f9?w=1200&fit=max',
				alt: 'Flyer on table with blank area',
			},
		],
	},
	{
		id: 'websites',
		labelKey: 'websites',
		images: [
			{
				url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&fit=max',
				alt: 'Website mockup on laptop',
			},
			{
				url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&fit=max',
				alt: 'Minimal website layout on screen',
			},
		],
	},
	{
		id: 'books-magazines',
		labelKey: 'books',
		images: [
			{
				url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&fit=max',
				alt: 'Open book with blank page',
			},
		],
	},
	{
		id: 'merchandise',
		labelKey: 'merchandise',
		images: [
			{
				url: 'https://images.unsplash.com/photo-1520975682031-a9b7b60cbbec?w=1200&fit=max',
				alt: 'White t-shirt mockup',
			},
			{
				url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=1200&fit=max',
				alt: 'Blank coffee mug on table',
			},
			{
				url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200&fit=max',
				alt: 'Minimal notebook cover',
			},
		],
	},
];

export function PredefinedBackgrounds({ onSelect, className = '' }: PredefinedBackgroundsProps) {
	const t = useTranslations('generator.preview.predefined');
	const [selectedCategory, setSelectedCategory] = useState(
		BACKGROUND_CATEGORIES[0]?.id || 'business-cards',
	);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);

	const currentCategory = BACKGROUND_CATEGORIES.find((cat) => cat.id === selectedCategory);

	const handleSelect = (imageUrl: string) => {
		setSelectedImage(imageUrl);
		onSelect(imageUrl);
	};

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Category Tabs */}
			<div className="overflow-x-auto">
				<div className="flex gap-2 pb-2 flex-wrap">
					{BACKGROUND_CATEGORIES.map((category) => (
						<button
							key={category.id}
							onClick={() => setSelectedCategory(category.id)}
							className={`
								shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors
								${
									selectedCategory === category.id
										? 'bg-primary text-primary-foreground'
										: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
								}
							`}
						>
							{t(category.labelKey, { default: category.id })}
						</button>
					))}
				</div>
			</div>

			{/* Image Grid */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{currentCategory?.images?.map((image, index) => (
					<motion.button
						key={`${selectedCategory}-${index}`}
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: index * 0.05 }}
						onClick={() => handleSelect(image.url)}
						aria-label={`Select ${image.alt} as background`}
						aria-pressed={selectedImage === image.url}
						className={`
							group relative aspect-video overflow-hidden rounded-lg border-2 transition-all
							${
								selectedImage === image.url
									? 'border-primary shadow-lg'
									: 'border-gray-200 hover:border-primary/50 dark:border-gray-700'
							}
						`}
					>
						{/* Background Image */}
						<img
							src={image.url}
							alt={image.alt}
							className="h-full w-full object-cover transition-transform group-hover:scale-105"
							loading="lazy"
						/>

						{/* Overlay */}
						<div
							className={`
							absolute inset-0 bg-black transition-opacity
							${selectedImage === image.url ? 'opacity-20' : 'opacity-0 group-hover:opacity-10'}
						`}
						/>

						{/* Selected Indicator */}
						{selectedImage === image.url && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="absolute right-2 top-2 rounded-full bg-primary p-1 shadow-lg"
							>
								<CheckCircleIcon className="h-5 w-5 text-white" />
							</motion.div>
						)}

						{/* Image Label */}
						<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
							<p className="text-xs text-white">{image.alt}</p>
						</div>
					</motion.button>
				))}
			</div>
		</div>
	);
}
