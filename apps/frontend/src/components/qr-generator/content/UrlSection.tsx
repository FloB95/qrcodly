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

type FormValues = Omit<TUrlInput, "shortUrl">;

type TUrlSectionProps = {
	onChange: (data: TUrlInput) => void;
	value: FormValues;
};

const generateShortUrl = () => {
	const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
	const randomString = Array.from({ length: 5 }, () =>
		characters.charAt(Math.floor(Math.random() * characters.length)),
	).join("");
	return `https://www.qrcodly.de/u/${randomString}`;
};

export const UrlSection = ({ value, onChange }: TUrlSectionProps) => {
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const [shortUrl] = useState<string | null>(generateShortUrl());
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
		const payload: TUrlInput = {
			...values,
			url: originalUrl,
			shortUrl: shortUrl,
		};

		onChange(payload);
	}

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
										placeholder="Enter URL https://example.com/"
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

								{form.getValues().isEditable && shortUrl && (
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
											onCheckedChange={async (e) => {
												if (!isSignedIn) {
													setAlertOpen(true);
													return;
												}
												field.onChange(e);
												void form.handleSubmit(onSubmit)();
											}}
										/>
									</FormControl>
									<FormLabel className="relative mt-[4px] ml-2 pr-2">
										Enable Statistics and Editing
										<Badge
											variant="green"
											className="xs:absolute xs:top-5 relative top-2 block sm:top-[-10px] sm:left-full"
										>
											New!
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
