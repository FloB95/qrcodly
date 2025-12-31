'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SocialInputSchema, type TSocialInput, type TSocialPlatform } from '@shared/schemas/src';
import Image from 'next/image';

export const SOCIALS: {
	key: TSocialPlatform;
	label: string;
	icon: string;
}[] = [
	{ key: 'instagram', label: 'Instagram', icon: '/social-logos/instagram.svg' },
	{ key: 'whatsapp', label: 'WhatsApp', icon: '/social-logos/whatsapp.svg' },
	{ key: 'tiktok', label: 'TikTok', icon: '/social-logos/tiktok.svg' },
	{ key: 'youtube', label: 'YouTube', icon: '/social-logos/youtube.svg' },
	{ key: 'spotify', label: 'Spotify', icon: '/social-logos/spotify.svg' },
	{ key: 'threads', label: 'Threads', icon: '/social-logos/threads.svg' },
	{ key: 'facebook', label: 'Facebook', icon: '/social-logos/facebook.svg' },
	{ key: 'x', label: 'X', icon: '/social-logos/x.svg' },
	{ key: 'soundcloud', label: 'SoundCloud', icon: '/social-logos/soundcloud.svg' },
	{ key: 'snapchat', label: 'Snapchat', icon: '/social-logos/snapchat.svg' },
	{ key: 'pinterest', label: 'Pinterest', icon: '/social-logos/pinterest.svg' },
	{ key: 'patreon', label: 'Patreon', icon: '/social-logos/patreon.svg' },
];

type SocialSectionProps = {
	value: TSocialInput;
	onChange: (data: TSocialInput) => void;
};

export const SocialSection = ({ value, onChange }: SocialSectionProps) => {
	const t = useTranslations('generator.contentSwitch.social');
	const [step, setStep] = useState<1 | 2>(1);
	const [selected, setSelected] = useState<TSocialPlatform[]>([]);

	const form = useForm<TSocialInput>({
		resolver: zodResolver(SocialInputSchema),
		defaultValues: value,
		shouldFocusError: false,
	});

	const { fields, remove, replace } = useFieldArray({
		control: form.control,
		name: 'links',
	});

	// ---------- STEP 1 ----------
	function togglePlatform(platform: TSocialPlatform) {
		setSelected((prev) =>
			prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
		);
	}

	function goToStep2() {
		const newLinks = selected.map((platform) => ({
			platform,
			label: SOCIALS.find((s) => s.key === platform)?.label ?? '',
			url: '',
		}));
		replace(newLinks);
		setStep(2);
	}

	// ---------- STEP 2 ----------
	function onSubmit(values: TSocialInput) {
		onChange(values);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="title"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t('title.label')}</FormLabel>
							<FormControl>
								<Input {...field} placeholder={t('title.placeholder')} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{step === 1 && (
					<>
						<div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-5 gap-3">
							{SOCIALS.map((social) => {
								const active = selected.includes(social.key);

								return (
									<Button
										key={social.key}
										onClick={() => togglePlatform(social.key)}
										variant={active ? 'outlineStrong' : 'outline'}
										className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition w-full h-full`}
									>
										<div className="h-8 w-10 flex justify-center align-middle">
											<Image src={social.icon} alt="" width={34} height={34} />
										</div>
										<span className="text-sm font-semibold">{social.label}</span>
									</Button>
								);
							})}
						</div>

						<Button type="button" disabled={selected.length === 0} onClick={goToStep2}>
							{t('nextBtn')}
						</Button>
					</>
				)}

				{step === 2 && (
					<>
						<div className="space-y-4">
							{fields.map((field, index) => {
								const social = SOCIALS.find((s) => s.key === field.platform);

								return (
									<div key={field.id} className="rounded-lg border p-4 space-y-3">
										<div className="flex items-center gap-2 font-semibold">
											{social?.icon && <Image src={social.icon} alt="" width={20} height={20} />}
											{social?.label}
										</div>

										<FormField
											control={form.control}
											name={`links.${index}.label`}
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input {...field} placeholder="Label" />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name={`links.${index}.url`}
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input {...field} placeholder="https://..." />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<Button type="button" variant="destructive" onClick={() => remove(index)}>
											{t('removeBtn')}
										</Button>
									</div>
								);
							})}
						</div>

						<div className="flex gap-2">
							<Button type="button" variant="secondary" onClick={() => setStep(1)}>
								{t('backBtn')}
							</Button>
							<Button type="submit">{t('saveBtn')}</Button>
						</div>
					</>
				)}
			</form>
		</Form>
	);
};
