'use client';

import { useForm } from 'react-hook-form';
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
import { ColorPicker } from './ColorPicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import IconPicker from './IconPicker';
import type { TQrCodeOptions } from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { Button } from '@/components/ui/button';
import { TrashIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const SettingsForm = () => {
	const t = useTranslations('generator.settingsForm');
	const { config, updateConfig } = useQrCodeGeneratorStore((state) => state);

	const handleIconSelect = (iconName?: string) => {
		config.image = iconName;
		updateConfig(config);
		form.setValue('image', iconName ?? '');
	};

	const form = useForm<TQrCodeOptions>({
		defaultValues: {
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
		},
	});

	const handleChange = (data: TQrCodeOptions) => {
		config.width = Number(data.width);
		config.height = Number(data.height);
		config.margin = (config.width / 100) * data.margin;

		config.dotsOptions = {
			type: data.dotsOptions.type,
			style: data.dotsOptions.style,
		};

		config.cornersSquareOptions = {
			type: data.cornersSquareOptions.type,
			style: data.cornersSquareOptions.style,
		};

		config.cornersDotOptions = {
			type: data.cornersDotOptions.type,
			style: data.cornersDotOptions.style,
		};

		config.backgroundOptions = {
			style: data.backgroundOptions.style,
		};

		config.imageOptions = {
			hideBackgroundDots: data.imageOptions.hideBackgroundDots,
		};

		updateConfig(config);
	};

	return (
		<Form {...form}>
			<form onChange={form.handleSubmit(handleChange)} className="space-y-6 xl:w-2/3">
				<Tabs defaultValue={'general'} className="w-full">
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
								render={() => (
									<FormItem>
										<FormLabel>{t('sizeLabel')}</FormLabel>
										<FormControl>
											<Slider
												name="width"
												className="cursor-pointer"
												value={[form.getValues('width')]}
												max={2000}
												min={300}
												step={25}
												onValueChange={(e: unknown) => {
													form.setValue('width', e as number);
													form.setValue('height', e as number);
												}}
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
												name="margin"
												className="cursor-pointer"
												value={[field.value]}
												max={10}
												min={0}
												step={1}
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
								render={({ field }) => {
									return (
										<FormItem>
											<FormLabel>{t('backgroundLabel')}</FormLabel>
											<FormControl>
												<div>
													<ColorPicker
														defaultColor={field.value}
														onChange={(color) => {
															field.onChange(color);
															handleChange(form.getValues());
														}}
													/>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						</div>
					</TabsContent>

					<TabsContent value="dot" className="mt-0">
						<div className="flex flex-col flex-wrap space-y-6 p-2">
							<div className="block w-full flex-wrap space-y-2 sm:flex sm:space-y-0 sm:space-x-8">
								<FormField
									control={form.control}
									name="dotsOptions.type"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>{t('dotStyle.label')}</FormLabel>
											<FormControl>
												<Select
													name="dotsOptions.type"
													onValueChange={field.onChange}
													value={field.value}
												>
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
												<div>
													<ColorPicker
														defaultColor={field.value}
														onChange={(color) => {
															field.onChange(color);
															handleChange(form.getValues());
														}}
													/>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="block w-full flex-wrap space-y-2 sm:flex sm:space-y-0 sm:space-x-8">
								<FormField
									control={form.control}
									name="cornersSquareOptions.type"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>{t('cornersSquareOptions.label')}</FormLabel>
											<FormControl>
												<Select
													name="cornersSquareOptions.type"
													onValueChange={field.onChange}
													value={field.value}
												>
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
												<div>
													<ColorPicker
														defaultColor={field.value}
														onChange={(color) => {
															field.onChange(color);
															handleChange(form.getValues());
														}}
													/>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="block w-full flex-wrap space-y-2 sm:flex sm:space-y-0 sm:space-x-8">
								<FormField
									control={form.control}
									name="cornersDotOptions.type"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>{t('cornersDotOptions.label')}</FormLabel>
											<FormControl>
												<Select
													name="cornersDotOptions.type"
													onValueChange={field.onChange}
													value={field.value}
												>
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
												<div>
													<ColorPicker
														defaultColor={field.value}
														onChange={(color) => {
															field.onChange(color);
															handleChange(form.getValues());
														}}
													/>
												</div>
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
													name="image"
													type="file"
													accept=".jpg,.jpeg,.png,.svg,.webp"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															if (file.size > 1 * 1024 * 1024) {
																alert(t('errorToLargeFile'));
																e.target.value = '';
																return;
															}

															const reader = new FileReader();
															reader.readAsDataURL(file);
															reader.onload = () => {
																const base64 = reader.result as string;
																config.image = base64;
																updateConfig(config);
															};
														}
													}}
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
											<Checkbox
												name="imageOptions.hideBackgroundDots"
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
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
										<Button
											variant="destructive"
											onClick={() => updateConfig({ ...config, image: '' })}
										>
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
