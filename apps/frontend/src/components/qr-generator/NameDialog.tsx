import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

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
	const [name, setName] = useState('');
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{dialogHeadline}</DialogTitle>
				</DialogHeader>
				<Input
					placeholder={placeholder ?? 'Name'}
					id="name"
					className="my-2"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<DialogFooter>
					<Button type="submit" onClick={() => onSubmit(name)}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
