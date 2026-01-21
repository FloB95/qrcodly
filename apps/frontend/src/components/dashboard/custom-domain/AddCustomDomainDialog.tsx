'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useCreateCustomDomainMutation } from '@/lib/api/custom-domain';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

// Subdomain regex - matches valid single-level subdomain names only (subdomain.domain.tld)
const subdomainRegex =
	/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;

// Helper to check if a domain is a single-level subdomain (exactly 3 parts)
function isSingleLevelSubdomain(domain: string): boolean {
	const parts = domain.split('.');
	return parts.length === 3;
}

// Helper to check if domain contains qrcodly (blocked)
function isQrcodlyDomain(domain: string): boolean {
	return domain.toLowerCase().includes('qrcodly');
}

const AddDomainSchema = z.object({
	domain: z
		.string()
		.min(3, 'Domain must be at least 3 characters')
		.max(255, 'Domain must be at most 255 characters')
		.transform((d) => d.toLowerCase().trim())
		.refine((d) => !isQrcodlyDomain(d), {
			message: 'QRcodly domains cannot be used as custom domains.',
		})
		.refine((d) => subdomainRegex.test(d), {
			message: 'Invalid domain format. Please enter a valid subdomain.',
		})
		.refine(isSingleLevelSubdomain, {
			message:
				'Only single-level subdomains are supported (e.g., links.example.com). Multi-level subdomains are not allowed.',
		}),
});

type AddDomainFormData = z.infer<typeof AddDomainSchema>;

export function AddCustomDomainDialog() {
	const t = useTranslations('settings.domains');
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const createMutation = useCreateCustomDomainMutation();

	const form = useForm<AddDomainFormData>({
		resolver: zodResolver(AddDomainSchema),
		defaultValues: {
			domain: '',
		},
	});

	const onSubmit = async (data: AddDomainFormData) => {
		createMutation.mutate(data, {
			onSuccess: (response) => {
				setOpen(false);
				form.reset();
				toast({
					title: t('addSuccess'),
					description: t('addSuccessDescription', { domain: response.domain }),
				});
				posthog.capture('custom-domain:created', { domain: response.domain });

				// Navigate with showInstructions param to auto-open the setup modal
				const params = new URLSearchParams(searchParams.toString());
				params.set('showInstructions', response.id);
				router.push(`${pathname}?${params.toString()}`);
			},
			onError: (error) => {
				toast({
					title: t('addError'),
					description: error.message,
					variant: 'destructive',
				});
				Sentry.captureException(error);
				posthog.capture('error:custom-domain-create', { error, domain: data.domain });
			},
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">{t('addDomain')}</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t('addDomainTitle')}</DialogTitle>
					<DialogDescription>{t('addDomainDescription')}</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="domain"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t('domain')}</FormLabel>
									<FormControl>
										<Input placeholder="links.example.com" {...field} />
									</FormControl>
									<FormDescription>{t('domainHint')}</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
								disabled={createMutation.isPending}
							>
								{t('cancel')}
							</Button>
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								{t('add')}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
