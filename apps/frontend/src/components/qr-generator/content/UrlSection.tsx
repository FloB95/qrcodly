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

type FormValues = TUrlInput;

type TUrlSectionProps = {
	onChange: (data: FormValues) => void;
	value: FormValues;
};

export const UrlSection = ({ value, onChange }: TUrlSectionProps) => {
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(UrlInputSchema),
		defaultValues: {
			url: value?.url,
			isEditable: false,
			isActive: true,
		},
	});
	const [debounced] = useDebouncedValue<FormValues>(form.getValues(), 500);

	function onSubmit(values: FormValues) {
		onChange(values);
	}

	// handle submit automatically after debounced value
	useEffect(() => {
		if (
			JSON.stringify(debounced) === "{}" ||
			JSON.stringify(debounced) === JSON.stringify(value) ||
			typeof debounced?.url === "undefined"
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
										className="p-6"
										placeholder="Enter URL https://example.com/"
										autoFocus
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
					<FormField
						control={form.control}
						name="isEditable"
						render={({ field }) => (
							<FormItem>
								<div className="flex">
									<FormControl>
										<Switch
											disabled
											checked={field.value}
											onCheckedChange={(e) => {
												if (!isSignedIn) {
													setAlertOpen(true);
													return;
												}
												field.onChange(e);
												void form.handleSubmit(onSubmit)();
											}}
										/>
									</FormControl>
									<FormLabel className="relative mt-[4px] ml-2 pr-10">
										Enable Statistics and Editing
										<Badge className="xs:absolute xs:top-5 relative top-2 block w-[110px] sm:top-[-10px] sm:right-[-35%]">
											Coming soon!
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
