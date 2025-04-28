"use client";

import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@clerk/nextjs";
import { LoginRequiredDialog } from "../LoginRequiredDialog";
import { Badge } from "@/components/ui/badge";
import { UrlInputSchema, type TUrlInput } from "@shared/schemas";
import { ArrowTurnDownRightIcon } from "@heroicons/react/24/outline";
import { useGetReservedShortUrlMutation } from "@/lib/api/url-shortener";
import { useTranslations } from "next-intl";

type FormValues = TUrlInput;

type TUrlSectionProps = {
	onChange: (data: TUrlInput) => void;
	value: FormValues;
};

export const UrlSection = ({ value, onChange }: TUrlSectionProps) => {
	const t = useTranslations("generator.contentSwitch.url");
	const getReservedShortUrlMutation = useGetReservedShortUrlMutation();
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const [shortUrl, setSortUrl] = useState<string | null>(null);
	const [originalUrl, setOriginalUrl] = useState<string | null>(
		value?.url ?? null,
	);

	const form = useForm<Omit<FormValues, "shortUrl">>({
		resolver: zodResolver(UrlInputSchema),
		defaultValues: {
			url: value?.url ?? "",
			isEditable: value?.isEditable ?? false,
		},
	});

	const [debounced] = useDebouncedValue<string | null>(originalUrl, 500);

	function onSubmit(values: FormValues) {
		if (!originalUrl) return;
		const payload = {
			...values,
			url: originalUrl,
			shortUrl: shortUrl,
		};

		onChange(payload);
	}

	async function getSortUrl() {
		const shortUrl = await getReservedShortUrlMutation.mutateAsync();
		setSortUrl(`https://www.qrcodly.de/u/${shortUrl.shortCode}`);
	}

	useEffect(() => {
		if (isSignedIn) {
			void getSortUrl();
		}
	}, [isSignedIn]);

	useEffect(() => {
		if (
			JSON.stringify(debounced) === "{}" ||
			JSON.stringify(debounced) === JSON.stringify(value?.url) ||
			debounced === null
		) {
			return;
		}
		void form.handleSubmit(onSubmit)();
	}, [debounced]);

	return (
		<>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					<FormField
						control={form.control}
						name="url"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input
										{...field}
										value={originalUrl ?? field.value}
										onChange={(e) => {
											const val = e.target.value;
											setOriginalUrl(val);
											field.onChange(val);
										}}
										className="p-6"
										placeholder={t("placeholder")}
										autoFocus
										onBlur={(e) => {
											if (e.target.value === "") return;
											if (
												!e.target.value.startsWith("http://") &&
												!e.target.value.startsWith("https://")
											) {
												const withHttps = `https://${e.target.value}`;
												setOriginalUrl(withHttps);
												field.onChange(withHttps);
											}
										}}
									/>
								</FormControl>

								{form.getValues().isEditable && shortUrl && originalUrl && (
									<div className="-mt-1 ml-6 flex items-center opacity-100 transition-opacity duration-300 ease-in-out">
										<ArrowTurnDownRightIcon className="mr-3 h-6 w-6 font-bold" />
										<span className="text-muted-foreground pt-1 text-sm">
											{shortUrl}
										</span>
									</div>
								)}

								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="isEditable"
						render={({ field }) => (
							<FormItem>
								<div className="flex">
									<FormControl>
										<Switch
											checked={field.value}
											disabled={!originalUrl}
											onCheckedChange={async (e) => {
												if (!isSignedIn) {
													setAlertOpen(true);
													return;
												}

												if (!shortUrl) return;

												field.onChange(e);
												void form.handleSubmit(onSubmit)();
											}}
										/>
									</FormControl>
									<FormLabel className="relative mt-[4px] ml-2 pr-2">
										{t("enableEditing")}
										<Badge
											variant="green"
											className="xs:absolute xs:top-5 relative top-2 block w-fit sm:top-[-10px] sm:left-full"
										>
											{t("newBadge")}
										</Badge>
									</FormLabel>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
				</form>
			</Form>

			<LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />
		</>
	);
};
