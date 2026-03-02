import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { NameDialog } from '@/components/qr-generator/NameDialog';
import { ShareDialog } from '@/components/qr-code-share/ShareDialog';

type QrCodeDialogsProps = {
	qrCodeId: string;
	qrCodeName: string | null;
	nameDialogOpen: boolean;
	setNameDialogOpen: (open: boolean) => void;
	onUpdateName: (name: string) => void;
	showDeleteConfirm: boolean;
	setShowDeleteConfirm: (open: boolean) => void;
	onDelete: () => void;
	templateNameDialogOpen: boolean;
	setTemplateNameDialogOpen: (open: boolean) => void;
	onCreateTemplate: (name: string) => Promise<void>;
	shareDialogOpen: boolean;
	setShareDialogOpen: (open: boolean) => void;
};

export const QrCodeDialogs = ({
	qrCodeId,
	qrCodeName,
	nameDialogOpen,
	setNameDialogOpen,
	onUpdateName,
	showDeleteConfirm,
	setShowDeleteConfirm,
	onDelete,
	templateNameDialogOpen,
	setTemplateNameDialogOpen,
	onCreateTemplate,
	shareDialogOpen,
	setShareDialogOpen,
}: QrCodeDialogsProps) => {
	const t = useTranslations();
	const tTemplates = useTranslations('templates');

	return (
		<>
			<NameDialog
				dialogHeadline={t('qrCode.updateQrCodeName.title')}
				placeholder={t('qrCode.updateQrCodeName.placeholder')}
				isOpen={nameDialogOpen}
				setIsOpen={setNameDialogOpen}
				onSubmit={onUpdateName}
				defaultValue={qrCodeName ?? ''}
			/>

			<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('qrCode.confirmDeletePopup.title')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('qrCode.confirmDeletePopup.description')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel asChild>
							<Button variant="secondary">{t('qrCode.confirmDeletePopup.cancelBtn')}</Button>
						</AlertDialogCancel>
						<Button
							variant="destructive"
							onClick={() => {
								onDelete();
								setShowDeleteConfirm(false);
							}}
						>
							{t('qrCode.confirmDeletePopup.confirmBtn')}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<NameDialog
				dialogHeadline={tTemplates('savePopup.title')}
				placeholder={tTemplates('savePopup.placeholder')}
				isOpen={templateNameDialogOpen}
				setIsOpen={setTemplateNameDialogOpen}
				onSubmit={onCreateTemplate}
			/>

			<ShareDialog
				qrCodeId={qrCodeId}
				trigger={null}
				open={shareDialogOpen}
				onOpenChange={setShareDialogOpen}
			/>
		</>
	);
};
