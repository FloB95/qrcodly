import type { TConfigTemplateResponseDto } from "@shared/schemas";
import { DynamicQrCode } from "../DynamicQrCode";
import { TrashIcon } from "@heroicons/react/24/outline";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useCallback, useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useDeleteConfigTemplateMutation } from "@/lib/api/config-template";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
import Image from "next/image";

type TemplateListProps = {
	templates: TConfigTemplateResponseDto[];
	onSelect: (data: TConfigTemplateResponseDto) => void;
	deletable?: boolean;
};

export const TemplatesList = ({
	templates,
	onSelect,
	deletable,
}: TemplateListProps) => {
	const [selectedTemplate, setSelectedTemplate] =
		useState<TConfigTemplateResponseDto | null>(null);
	const [isDeleting, setIsDeleting] = useState<boolean>(false);
	const deleteTemplateMutation = useDeleteConfigTemplateMutation();

	const handleSelect = (template: TConfigTemplateResponseDto) => {
		onSelect(template);

		posthog.capture("config-template-selected", {
			id: template.id,
			templateName: template.name,
		});
	};

	const handleDelete = useCallback(() => {
		if (!selectedTemplate) return;

		setIsDeleting(true);
		const t = toast({
			title: "Template is being deleted",
			open: isDeleting,
			description: (
				<div className="flex space-x-2">
					<Loader2 className="mr-2 h-6 w-6 animate-spin" />{" "}
					<span>we are deleting your QR code</span>
				</div>
			),
		});

		deleteTemplateMutation.mutate(selectedTemplate.id, {
			onSuccess: () => {
				t.dismiss();
				setIsDeleting(false);
				setSelectedTemplate(null);

				posthog.capture("config-template-deleted", {
					id: selectedTemplate.id,
					templateName: selectedTemplate.name,
				});
			},
			onError: () => {
				t.dismiss();
				toast({
					title: "Failed to delete template",
					description:
						"An error occurred while deleting the template. . We got notified and will fix it soon.",
					variant: "destructive",
					duration: 5000,
				});
				setIsDeleting(false);
				setSelectedTemplate(null);
			},
		});
	}, [selectedTemplate, isDeleting]);

	return (
		<div className="grid h-[400px] cursor-pointer grid-cols-2 gap-4 overflow-y-auto px-2 lg:grid-cols-3">
			{templates.map((template, index) => {
				return (
					<div
						key={index}
						onClick={() => handleSelect(template)}
						className="group relative"
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<p className="text mb-1 truncate text-sm font-semibold">
									{template.name}
								</p>
							</TooltipTrigger>
							<TooltipContent side="top">{template.name}</TooltipContent>
						</Tooltip>
						<div className="relative overflow-hidden">
							{template.previewImage ? (
								<Image
									height={300}
									width={300}
									src={template.previewImage}
									alt="QR code preview"
									loading="lazy"
								/>
							) : (
								<DynamicQrCode
									qrCode={{
										config: template.config,
										content: "https://www.qrcodly.de/",
										contentType: "url",
									}}
								/>
							)}
							{deletable && (
								<Dialog>
									<DialogTrigger asChild>
										<Button
											size="icon"
											onClick={(e) => {
												e.stopPropagation(); // Prevent triggering the parent `onClick`
												setSelectedTemplate(template);
											}}
											className="absolute right-3 -bottom-1 h-8 w-8 -translate-y-1/2 scale-75 transform cursor-pointer opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
										>
											<TrashIcon className="h-6 w-6" />
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Confirm Deletion</DialogTitle>
											<DialogDescription>
												Are you sure you want to delete the template{" "}
												<span className="font-bold text-black">
													{selectedTemplate?.name}
												</span>{" "}
												? This action cannot be undone.
											</DialogDescription>
										</DialogHeader>
										<DialogFooter>
											<DialogClose asChild>
												<Button
													variant="secondary"
													onClick={() => setSelectedTemplate(null)}
												>
													Cancel
												</Button>
											</DialogClose>
											<DialogClose asChild>
												<Button
													variant="destructive"
													onClick={() => handleDelete()}
												>
													Delete
												</Button>
											</DialogClose>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
};
