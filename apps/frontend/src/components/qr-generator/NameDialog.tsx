import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { DialogClose } from "@radix-ui/react-dialog";

type TNameDialogProps = {
	dialogHeadline: string;
	placeholder?: string;
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	onSubmit: (name: string) => void;
};
export function NameDialog({
	dialogHeadline,
	placeholder,
	isOpen,
	setIsOpen,
	onSubmit,
}: TNameDialogProps) {
	const t = useTranslations("nameDialog");
	const [name, setName] = useState("");

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			onSubmit(name);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{dialogHeadline}</DialogTitle>
				</DialogHeader>
				<div className="my-2">
					<Input
						placeholder={placeholder ?? t("placeholder")}
						id="name"
						className="mb-1"
						value={name}
						onChange={(e) => setName(e.target.value.slice(0, 40))}
						onKeyDown={handleKeyDown}
						maxLength={40}
					/>
					<div className="text-sm text-gray-500">
						{name.length}/40 {t("characters")}
					</div>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="secondary">
							{t("cancelBtn")}
						</Button>
					</DialogClose>
					<Button type="submit" onClick={() => onSubmit(name)}>
						{t("saveBtn")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
