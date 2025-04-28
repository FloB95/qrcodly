"use client";

import { LoginRequiredDialog } from "../LoginRequiredDialog";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { NameDialog } from "../NameDialog";
import { Button } from "@/components/ui/button";
import { QrCodeDefaults, type TQrCodeOptions } from "@shared/schemas";
import { useCreateConfigTemplateMutation } from "@/lib/api/config-template";
import { toast } from "@/components/ui/use-toast";
import posthog from "posthog-js";
import { useTranslations } from "next-intl";

const QrCodeSaveTemplateBtn = ({ config }: { config: TQrCodeOptions }) => {
	const t = useTranslations("templates");
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
							title: t("templateCreatedTitle"),
							description: t("templateCreatedDescription"),
							duration: 10000,
						});

						posthog.capture("config-template-created", {
							templateName: templateName,
						});
					},
					onError: (e) => {
						toast({
							variant: "destructive",
							title: t("templateCreatedErrorTitle"),
							description: e.message,
							duration: 10000,
						});

						posthog.capture("error:config-template-created", {
							templateName: templateName,
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
						variant="outlineStrong"
						className="cursor-pointer"
						isLoading={createConfigTemplateMutation.isPending}
						onClick={() => {
							if (!isSignedIn) {
								// Store the config in localStorage before prompting login
								localStorage.setItem("unsavedQrConfig", JSON.stringify(config));
								setAlertOpen(true);
								return;
							}
							setNameDialogOpen(true);
						}}
						disabled={
							createConfigTemplateMutation.isPending ||
							JSON.stringify(config) === JSON.stringify(QrCodeDefaults)
						}
					>
						{t("saveAsBtn")}
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top">
					<p>{t("saveInfo")}</p>
				</TooltipContent>
			</Tooltip>

			<LoginRequiredDialog alertOpen={alertOpen} setAlertOpen={setAlertOpen} />

			<NameDialog
				dialogHeadline={t("savePopup.title")}
				placeholder={t("savePopup.placeholder")}
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={handleSave}
			/>
		</>
	);
};

export default QrCodeSaveTemplateBtn;
