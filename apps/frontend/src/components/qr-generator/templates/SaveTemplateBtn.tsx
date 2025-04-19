'use client';

import { LoginRequiredDialog } from '../LoginRequiredDialog';
import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { NameDialog } from '../NameDialog';
import { Button } from '@/components/ui/button';
import { QrCodeDefaults, type TQrCodeOptions } from '@shared/schemas';
import { useCreateConfigTemplateMutation } from '@/lib/api/config-template';
import { toast } from '@/components/ui/use-toast';

const QrCodeSaveTemplateBtn = ({ config }: { config: TQrCodeOptions }) => {
	const { isSignedIn } = useAuth();
	const [alertOpen, setAlertOpen] = useState(false);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);

	const createConfigTemplateMutation = useCreateConfigTemplateMutation();

	const handleSave = async (templateName: string) => {
		setNameDialogOpen(false);
		try {
			await createConfigTemplateMutation.mutateAsync(
				{
					config,
					name: templateName,
				},
				{
					onSuccess: () => {
						toast({
							title: 'New Template Created',
							description: 'We saved your QR Code Template for later use.',
							duration: 10000,
						});
					},
				},
			);
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant={
							JSON.stringify(config) === JSON.stringify(QrCodeDefaults) ? 'secondary' : 'default'
						}
						className="cursor-pointer"
						// isLoading={createQrCodeTemplateMutation.isPending}
						onClick={() => {
							if (!isSignedIn) {
								setAlertOpen(true);
								return;
							}
							setNameDialogOpen(true);
						}}
						disabled={JSON.stringify(config) === JSON.stringify(QrCodeDefaults)}
					>
						Save as Template
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top">
					<p>Save the current QR code style as a reusable template.</p>
				</TooltipContent>
			</Tooltip>

			<LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />

			<NameDialog
				dialogHeadline="Save current QR code style as template"
				placeholder="Template Name"
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={handleSave}
			/>
		</>
	);
};

export default QrCodeSaveTemplateBtn;
