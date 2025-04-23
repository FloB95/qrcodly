"use client";

import { useForm } from "react-hook-form";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { VCardInputSchema, type TVCardInput } from "@shared/schemas/src";
import { useTranslations } from "next-intl";

type FormValues = TVCardInput;

type VCardSectionProps = {
	onChange: (data: FormValues) => void;
	value: FormValues;
};

export const VCardSection = ({ onChange, value }: VCardSectionProps) => {
	const t = useTranslations("generator.contentSwitch.vCard");
	const form = useForm<FormValues>({
		resolver: zodResolver(VCardInputSchema),
		defaultValues: value,
		shouldFocusError: false,
		shouldUnregister: true,
		reValidateMode: "onBlur",
	});

	const [debounced] = useDebouncedValue(form.getValues(), 500);

	function onSubmit(values: FormValues) {
		onChange(values);
	}

	// handle submit automatically after debounced value
	useEffect(() => {
		const processedDebounced = Object.fromEntries(
			Object.entries(debounced).map(([key, val]) => [
				key,
				val === "" ? undefined : val,
			]),
		);

		if (
			JSON.stringify(processedDebounced) === "{}" ||
			JSON.stringify(processedDebounced) === JSON.stringify(value)
		)
			return;

		void form.handleSubmit(onSubmit)();
	}, [debounced]);

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<div className="flex space-x-4">
					<FormField
						control={form.control}
						name="firstName"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t("firstName.label")}</FormLabel>
								<FormControl>
									<Input {...field} placeholder={t("firstName.placeholder")} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="lastName"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t("lastName.label")}</FormLabel>
								<FormControl>
									<Input {...field} placeholder={t("lastName.placeholder")} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("email.label")}</FormLabel>
							<FormControl>
								<Input {...field} placeholder={t("email.placeholder")} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex space-x-4">
					<FormField
						control={form.control}
						name="phone"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t("phone.label")}</FormLabel>
								<FormControl>
									<Input {...field} placeholder={t("phone.placeholder")} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="fax"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t("fax.label")}</FormLabel>
								<FormControl>
									<Input {...field} placeholder={t("fax.placeholder")} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<div className="flex space-x-4">
					<FormField
						control={form.control}
						name="company"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t("company.label")}</FormLabel>
								<FormControl>
									<Input {...field} placeholder={t("company.placeholder")} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="job"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t("jobTitle.label")}</FormLabel>
								<FormControl>
									<Input {...field} placeholder={t("jobTitle.placeholder")} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name="street"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("street.label")}</FormLabel>
							<FormControl>
								<Input {...field} placeholder={t("street.placeholder")} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex space-x-4">
					<FormField
						control={form.control}
						name="city"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t("city.label")}</FormLabel>
								<FormControl>
									<Input {...field} placeholder={t("city.placeholder")} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="zip"
						render={({ field }) => (
							<FormItem className="w-full">
								<FormLabel>{t("zipCode.label")}</FormLabel>
								<FormControl>
									<Input {...field} placeholder={t("zipCode.placeholder")} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name="state"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("state.label")}</FormLabel>
							<FormControl>
								<Input {...field} placeholder={t("state.placeholder")} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="country"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("country.label")}</FormLabel>
							<FormControl>
								<Input {...field} placeholder={t("country.placeholder")} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="website"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("website.label")}</FormLabel>
							<FormControl>
								<Input
									{...field}
									placeholder={t("website.placeholder")}
									onBlur={(e) => {
										if (e.target.value === "") return;
										if (
											!e.target.value.startsWith("http://") &&
											!e.target.value.startsWith("https://")
										) {
											field.onChange(`https://${e.target.value}`);
										}
									}}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</form>
		</Form>
	);
};
