import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { useTranslations } from 'next-intl';
import { DialogClose } from '@radix-ui/react-dialog';
import { CharacterCounter } from './content/CharacterCounter';

type TNameDialogProps = {
	dialogHeadline: string;
	placeholder?: string;
	defaultValue?: string;
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	onSubmit: (name: string) => void;
};
export function NameDialog({
	dialogHeadline,
	placeholder,
	defaultValue,
	isOpen,
	setIsOpen,
	onSubmit,
}: TNameDialogProps) {
	const t = useTranslations('nameDialog');
	const [name, setName] = useState(defaultValue ?? '');

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
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
					<InputGroup>
						<InputGroupInput
							placeholder={placeholder ?? t('placeholder')}
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value.slice(0, 40))}
							onKeyDown={handleKeyDown}
							maxLength={32}
							className="pr-16"
						/>
						<InputGroupAddon align="inline-end">
							<CharacterCounter current={name.length} max={32} />
						</InputGroupAddon>
					</InputGroup>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button type="button" variant="secondary">
							{t('cancelBtn')}
						</Button>
					</DialogClose>
					<DialogClose asChild>
						<Button type="submit" onClick={() => onSubmit(name)}>
							{t('saveBtn')}
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
