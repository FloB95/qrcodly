'use client';

import { useForm } from 'react-hook-form';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useEffect, useState } from 'react';
import { LocationInputSchema, type TLocationInput } from '@shared/schemas/src';
import { useLocale, useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { StandaloneSearchBox, useJsApiLoader, type Libraries } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';
import { env } from '@/env';

type LocationSectionProps = {
	onChange: (data: TLocationInput) => void;
	value: TLocationInput;
};

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

export const LocationSection = ({ onChange, value }: LocationSectionProps) => {
	const t = useTranslations('generator.contentSwitch.location');
	const form = useForm<TLocationInput>({
		resolver: zodResolver(LocationInputSchema),
		defaultValues: value,
		shouldFocusError: false,
	});
	const locale = useLocale();

	const [debounced] = useDebouncedValue(form.getValues(), 500);
	const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);

	const { isLoaded } = useJsApiLoader({
		id: 'google-maps-script',
		googleMapsApiKey: env.NEXT_PUBLIC_GOOGLE_API_KEY,
		libraries: GOOGLE_MAPS_LIBRARIES,
		language: locale,
	});

	function onSubmit(values: TLocationInput) {
		onChange(values);
	}

	useEffect(() => {
		if (JSON.stringify(debounced) === '{}' || JSON.stringify(debounced) === JSON.stringify(value)) {
			return;
		}

		void form.handleSubmit(onSubmit)();
	}, [debounced]);

	const handlePlacesChanged = () => {
		if (!searchBox) return;
		const places = searchBox.getPlaces();
		if (!places || places.length === 0) return;

		const place = places[0];

		if (!place) return;

		const location = place.geometry?.location;

		form.setValue('address', place.formatted_address || '');
		form.setValue('latitude', location?.lat());
		form.setValue('longitude', location?.lng());
	};

	if (!isLoaded) {
		return (
			<div className="flex justify-center items-center py-16">
				<Loader2 className="h-10 w-10 animate-spin" />
			</div>
		);
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="address"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t('address.label')}</FormLabel>
							<FormControl>
								<StandaloneSearchBox
									onLoad={(ref) => setSearchBox(ref)}
									onPlacesChanged={handlePlacesChanged}
								>
									<Input {...field} placeholder={t('address.placeholder')} />
								</StandaloneSearchBox>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex space-x-4 hidden">
					<FormField
						control={form.control}
						name="latitude"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t('latitude.label')}</FormLabel>
								<FormControl>
									<Input {...field} readOnly />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="longitude"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t('longitude.label')}</FormLabel>
								<FormControl>
									<Input {...field} readOnly />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</form>
		</Form>
	);
};
