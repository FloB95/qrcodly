'use client';

import { memo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useEffect, useState } from 'react';
import { LocationInputSchema, type TLocationInput } from '@shared/schemas/src';
import { useLocale, useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { StandaloneSearchBox, useJsApiLoader, type Libraries } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';
import { env } from '@/env';
import { CharacterCounter } from './CharacterCounter';
import { stableStringify } from '@/lib/utils';

type LocationSectionProps = {
	onChange: (data: TLocationInput) => void;
	value: TLocationInput;
};

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

const _LocationSection = ({ onChange, value }: LocationSectionProps) => {
	const t = useTranslations('generator.contentSwitch.location');
	const locale = useLocale();

	const form = useForm<TLocationInput>({
		resolver: zodResolver(LocationInputSchema),
		defaultValues: value,
		shouldFocusError: false,
	});

	// -----------------------------
	// Stable debounced form values
	// -----------------------------
	const watchedValues = useWatch({ control: form.control }) as TLocationInput;
	const [debounced] = useDebouncedValue<TLocationInput>(watchedValues, 500);

	useEffect(() => {
		if (!debounced) return;

		if (stableStringify(debounced) === stableStringify(value)) return;

		onChange(debounced);
	}, [debounced, value, onChange]);

	// -----------------------------
	// Google Maps SearchBox logic
	// -----------------------------
	const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);

	const { isLoaded } = useJsApiLoader({
		id: 'google-maps-script',
		googleMapsApiKey: env.NEXT_PUBLIC_GOOGLE_API_KEY,
		libraries: GOOGLE_MAPS_LIBRARIES,
		language: locale,
	});

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

	// -----------------------------
	// Render form
	// -----------------------------
	return (
		<Form {...form}>
			<form className="space-y-6">
				<FormField
					control={form.control}
					name="address"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t('address.label')}*</FormLabel>
							<FormControl>
								<StandaloneSearchBox
									onLoad={(ref) => setSearchBox(ref)}
									onPlacesChanged={handlePlacesChanged}
								>
									<InputGroup>
										<InputGroupInput
											{...field}
											placeholder={t('address.placeholder')}
											maxLength={200}
											className="pr-20"
										/>
										<InputGroupAddon align="inline-end">
											<CharacterCounter current={field.value?.length || 0} max={200} />
										</InputGroupAddon>
									</InputGroup>
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

// Custom equality function to prevent unnecessary re-renders
function areLocationPropsEqual(prev: LocationSectionProps, next: LocationSectionProps) {
	return (
		JSON.stringify(prev.value) === JSON.stringify(next.value) && prev.onChange === next.onChange
	);
}

// Export memoized component
export const LocationSection = memo(_LocationSection, areLocationPropsEqual);
