'use client';

import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { TrashIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TQrCodeOptions, TColorOrGradient } from '@shared/schemas';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { ColorPicker } from './ColorPicker';
import IconPicker from './IconPicker';
import { useToast } from '@/components/ui/use-toast';

// Constants
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ACCEPTED_FILE_TYPES = '.jpg,.jpeg,.png,.svg,.webp';
const SIZE_CONFIG = {
	MIN: 300,
	MAX: 2000,
	STEP: 25,
} as const;
const MARGIN_CONFIG = {
	MIN: 0,
	MAX: 10,
	STEP: 1,
} as const;

export const SettingsForm = () => {
	const t = useTranslations('generator.settingsForm');
	const { toast } = useToast();
	const { config, updateConfig } = useQrCodeGeneratorStore((state) => state);

	// Memoize default values to prevent unnecessary re-renders
	const defaultValues = useMemo<TQrCodeOptions>(
		() => ({
			width: config.width,
			height: config.height,
			margin: config.margin,
			dotsOptions: {
				type: config.dotsOptions.type,
				style: config.dotsOptions.style,
			},
			cornersSquareOptions: {
				type: config.cornersSquareOptions.type,
				style: config.cornersSquareOptions.style,
			},
			cornersDotOptions: {
				type: config.cornersDotOptions.type,
				style: config.cornersDotOptions.style,
			},
			backgroundOptions: {
				style: config.backgroundOptions.style,
			},
			imageOptions: {
				hideBackgroundDots: config.imageOptions?.hideBackgroundDots ?? true,
			},
		}),
		[config],
	);

	const form = useForm<TQrCodeOptions>({
		defaultValues,
	});

	// Memoized handler to update config immutably
	const handleChange = useCallback(
		(data: TQrCodeOptions) => {
			const updatedConfig = {
				...config,
				width: Number(data.width),
				height: Number(data.height),
				margin: (Number(data.width) / 100) * data.margin,
				dotsOptions: {
					type: data.dotsOptions.type,
					style: data.dotsOptions.style,
				},
				cornersSquareOptions: {
					type: data.cornersSquareOptions.type,
					style: data.cornersSquareOptions.style,
				},
				cornersDotOptions: {
					type: data.cornersDotOptions.type,
					style: data.cornersDotOptions.style,
				},
				backgroundOptions: {
					style: data.backgroundOptions.style,
				},
				imageOptions: {
					hideBackgroundDots: data.imageOptions.hideBackgroundDots,
				},
			};
			updateConfig(updatedConfig);
		},
		[config, updateConfig],
	);

	// Memoized icon selection handler
	const handleIconSelect = useCallback(
		(iconName?: string) => {
			const updatedConfig = {
				...config,
				image: iconName,
			};
			updateConfig(updatedConfig);
			form.setValue('image', iconName ?? '');
		},
		[config, updateConfig, form],
	);

	// Memoized icon removal handler
	const handleRemoveIcon = useCallback(() => {
		const updatedConfig = {
			...config,
			image: '',
		};
		updateConfig(updatedConfig);
	}, [config, updateConfig]);

	// Memoized file upload handler with proper error handling
	const handleFileUpload = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) return;

			// Validate file size
			if (file.size > MAX_FILE_SIZE) {
				toast({
					variant: 'destructive',
					title: t('errorToLargeFile'),
				});
				event.target.value = '';
				return;
			}

			const reader = new FileReader();

			reader.onload = () => {
				const base64 = reader.result as string;
				const updatedConfig = {
					...config,
					image: base64,
				};
				updateConfig(updatedConfig);
			};

			reader.onerror = () => {
				toast({
					variant: 'destructive',
					title: 'Failed to read file',
				});
				event.target.value = '';
			};

			reader.readAsDataURL(file);
		},
		[config, updateConfig, t, toast],
	);

	// Memoized size change handler
	const handleSizeChange = useCallback(
		(value: number[]) => {
			const newSize = value[0];
			if (newSize !== undefined) {
				form.setValue('width', newSize);
				form.setValue('height', newSize);
			}
		},
		[form],
	);

	// Memoized color change handler factory
	const createColorChangeHandler = useCallback(
		(fieldOnChange: (value: TColorOrGradient) => void) => (color: TColorOrGradient) => {
			fieldOnChange(color);
			handleChange(form.getValues());
		},
		[form, handleChange],
	);

	return (
		<Form {...form}>
			<form onChange={form.handleSubmit(handleChange)} className="space-y-6 xl:w-2/3">
				<Tabs defaultValue="general" className="w-full">
					<TabsList className="mb-4 w-full">
						<TabsTrigger className="flex-1" value="general">
							{t('tabGeneral')}
						</TabsTrigger>
						<TabsTrigger className="flex-1" value="dot">
							{t('tabShape')}
						</TabsTrigger>
						<TabsTrigger className="flex-1" value="image">
							{t('tabIcon')}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="general" className="mt-0">
						<div className="flex flex-col flex-wrap space-y-6 p-2">
							<FormField
								control={form.control}
								name="width"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('sizeLabel')}</FormLabel>
										<FormControl>
											<Slider
												className="cursor-pointer"
												value={[field.value]}
												max={SIZE_CONFIG.MAX}
												min={SIZE_CONFIG.MIN}
												step={SIZE_CONFIG.STEP}
												onValueChange={handleSizeChange}
											/>
										</FormControl>
										<FormDescription className="pt-1 text-center">
											{form.getValues('height')} x {form.getValues('width')} px
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="margin"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('borderSpacingLabel')}</FormLabel>
										<FormControl>
											<Slider
												className="cursor-pointer"
												value={[field.value]}
												max={MARGIN_CONFIG.MAX}
												min={MARGIN_CONFIG.MIN}
												step={MARGIN_CONFIG.STEP}
												onValueChange={field.onChange}
											/>
										</FormControl>
										<FormDescription className="pt-1 text-center">{field.value} %</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="backgroundOptions.style"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t('backgroundLabel')}</FormLabel>
										<FormControl>
											<ColorPicker
												defaultColor={field.value}
												onChange={createColorChangeHandler(field.onChange)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</TabsContent>

					<TabsContent value="dot" className="mt-0">
						<div className="flex flex-col flex-wrap space-y-6 p-2">
							{/* Dots Options */}
							<div className="block w-full flex-wrap space-y-2 sm:flex sm:space-y-0 sm:space-x-8">
								<FormField
									control={form.control}
									name="dotsOptions.type"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>{t('dotStyle.label')}</FormLabel>
											<FormControl>
												<Select onValueChange={field.onChange} value={field.value}>
													<SelectTrigger>
														<SelectValue placeholder={t('dotStyle.placeholder')} />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="square">
															{t('dotStyle.optionLabelSquare')}
														</SelectItem>
														<SelectItem value="dots">{t('dotStyle.optionLabelDots')}</SelectItem>
														<SelectItem value="rounded">
															{t('dotStyle.optionLabelRounded')}
														</SelectItem>
														<SelectItem value="extra-rounded">
															{t('dotStyle.optionLabelExtraRound')}
														</SelectItem>
														<SelectItem value="classy">
															{t('dotStyle.optionLabelClassy')}
														</SelectItem>
														<SelectItem value="classy-rounded">
															{t('dotStyle.optionLabelClassyRounded')}
														</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="dotsOptions.style"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('dotColor')}</FormLabel>
											<FormControl>
												<ColorPicker
													defaultColor={field.value}
													onChange={createColorChangeHandler(field.onChange)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Corners Square Options */}
							<div className="block w-full flex-wrap space-y-2 sm:flex sm:space-y-0 sm:space-x-8">
								<FormField
									control={form.control}
									name="cornersSquareOptions.type"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>{t('cornersSquareOptions.label')}</FormLabel>
											<FormControl>
												<Select onValueChange={field.onChange} value={field.value}>
													<SelectTrigger>
														<SelectValue placeholder={t('cornersSquareOptions.placeholder')} />
													</SelectTrigger>
													<SelectContent>
														<SelectItem icon="icons/corners-square-square.svg" value="square">
															{t('cornersSquareOptions.optionLabelSquare')}
														</SelectItem>
														<SelectItem icon="icons/corners-square-dot.svg" value="dot">
															{t('cornersSquareOptions.optionLabelDot')}
														</SelectItem>
														<SelectItem
															icon="icons/corners-square-rounded.svg"
															value="extra-rounded"
														>
															{t('cornersSquareOptions.optionLabelExtraRound')}
														</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="cornersSquareOptions.style"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('cornersSquareColor')}</FormLabel>
											<FormControl>
												<ColorPicker
													defaultColor={field.value}
													onChange={createColorChangeHandler(field.onChange)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Corners Dot Options */}
							<div className="block w-full flex-wrap space-y-2 sm:flex sm:space-y-0 sm:space-x-8">
								<FormField
									control={form.control}
									name="cornersDotOptions.type"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>{t('cornersDotOptions.label')}</FormLabel>
											<FormControl>
												<Select onValueChange={field.onChange} value={field.value}>
													<SelectTrigger>
														<SelectValue placeholder={t('cornersDotOptions.placeholder')} />
													</SelectTrigger>
													<SelectContent>
														<SelectItem icon="icons/corners-dot-square.svg" value="square">
															{t('cornersDotOptions.optionLabelSquare')}
														</SelectItem>
														<SelectItem icon="icons/corners-dot-dot.svg" value="dot">
															{t('cornersDotOptions.optionLabelDot')}
														</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="cornersDotOptions.style"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t('cornersDotColor')}</FormLabel>
											<FormControl>
												<ColorPicker
													defaultColor={field.value}
													onChange={createColorChangeHandler(field.onChange)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="image" className="mt-0">
						<div className="flex flex-col flex-wrap space-y-6 p-2">
							<FormField
								control={form.control}
								name="image"
								render={() => (
									<FormItem>
										<FormLabel>{t('iconLabel')}</FormLabel>
										<FormControl>
											<div className="grid w-full max-w-sm items-center gap-1.5">
												<Input
													type="file"
													accept={ACCEPTED_FILE_TYPES}
													onChange={handleFileUpload}
												/>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="imageOptions.hideBackgroundDots"
								render={({ field }) => (
									<FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
										<FormLabel className="cursor-pointer">{t('hideBackgroundDots')}</FormLabel>
										<FormControl>
											<Checkbox checked={field.value} onCheckedChange={field.onChange} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex justify-between">
								<div>
									<p className="mb-4 text-sm leading-none font-medium">{t('predefinedIconInfo')}</p>
									<IconPicker onSelect={handleIconSelect} />
								</div>
								{config.image && (
									<div className="flex flex-col justify-end">
										<Button variant="destructive" onClick={handleRemoveIcon}>
											<TrashIcon color="white" width={24} height={24} className="sm:mr-2" />
											<span className="hidden sm:block">{t('clearBtn')}</span>
										</Button>
									</div>
								)}
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</form>
		</Form>
	);
};
