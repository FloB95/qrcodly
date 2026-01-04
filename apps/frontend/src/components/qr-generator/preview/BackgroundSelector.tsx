/**
 * Background selector component
 * Provides camera capture and file upload options
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CameraIcon, ArrowUpTrayIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CameraCapture } from './CameraCapture';
import { PredefinedBackgrounds } from './PredefinedBackgrounds';
import { useTranslations } from 'next-intl';
import type { BackgroundSource } from './types';

interface BackgroundSelectorProps {
	source: BackgroundSource;
	onSourceChange: (source: BackgroundSource) => void;
	onImageSelected: (imageDataUrl: string) => void;
}

export function BackgroundSelector({
	source,
	onSourceChange,
	onImageSelected,
}: BackgroundSelectorProps) {
	const t = useTranslations('generator.preview');
	const [isDragging, setIsDragging] = useState(false);

	const handleFileUpload = async (files: FileList | null) => {
		if (!files || files.length === 0) return;

		const file = files[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith('image/')) {
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return;
		}

		// Read file as data URL
		const reader = new FileReader();
		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			if (dataUrl) {
				onImageSelected(dataUrl);
			}
		};
		reader.readAsDataURL(file);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		handleFileUpload(e.dataTransfer.files);
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		// Only reset if actually leaving the drop zone, not entering a child
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setIsDragging(false);
		}
	};

	return (
		<Tabs
			value={source || 'predefined'}
			onValueChange={(value) => onSourceChange(value as BackgroundSource)}
			className="w-full"
		>
			<TabsList className="grid w-full grid-cols-3">
				<TabsTrigger value="predefined" className="flex items-center gap-2">
					<PhotoIcon className="h-4 w-4" />
					{t('predefined.title', { default: 'Examples' })}
				</TabsTrigger>
				<TabsTrigger value="camera" className="flex items-center gap-2">
					<CameraIcon className="h-4 w-4" />
					{t('camera.title', { default: 'Camera' })}
				</TabsTrigger>
				<TabsTrigger value="upload" className="flex items-center gap-2">
					<ArrowUpTrayIcon className="h-4 w-4" />
					{t('upload.title', { default: 'Upload' })}
				</TabsTrigger>
			</TabsList>

			<TabsContent value="predefined" className="mt-4">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
				>
					<PredefinedBackgrounds onSelect={onImageSelected} />
				</motion.div>
			</TabsContent>

			<TabsContent value="camera" className="mt-4">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
				>
					<CameraCapture onCapture={onImageSelected} />
				</motion.div>
			</TabsContent>

			<TabsContent value="upload" className="mt-4">
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
				>
					<div
						onDrop={handleDrop}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						className={`
							relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center
							rounded-lg border-2 border-dashed p-8 transition-colors
							${
								isDragging
									? 'border-primary bg-primary/5'
									: 'border-gray-300 hover:border-primary hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900'
							}
						`}
					>
						<input
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onChange={(e) => handleFileUpload(e.target.files)}
							className="absolute inset-0 cursor-pointer opacity-0"
						/>
						<ArrowUpTrayIcon className="mb-3 h-12 w-12 text-gray-400" />
						<p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
							{t('upload.dragDrop', { default: 'Drag and drop an image here' })}
						</p>
						<p className="text-xs text-gray-500">
							{t('upload.orClick', { default: 'or click to browse' })}
						</p>
						<p className="mt-2 text-xs text-gray-400">
							{t('upload.formats', { default: 'JPG, PNG, WEBP (max 5MB)' })}
						</p>
					</div>
				</motion.div>
			</TabsContent>
		</Tabs>
	);
}
