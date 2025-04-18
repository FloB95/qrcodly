import { buttonVariants } from '@/components/ui/button';
import {
	DocumentTextIcon,
	LinkIcon,
	WifiIcon,
	IdentificationIcon,
} from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlSection } from './UrlSection';
import { TextSection } from './TextSection';
import { type TCurrentQrCodeInput } from '../QRcodeGenerator';
import { VcardSection } from './VcardSection';
import { WiFiSection } from './WiFiSection';
import {
	convertVCardObjToString,
	convertWiFiObjToString,
	VCardInputSchema,
	WifiInputSchema,
	type TQrCodeContent,
	type TQrCodeContentType,
} from 'qrcodly-api-types';

type TContentSwitchProps = {
	currentInput: TCurrentQrCodeInput;
	setCurrentInput: (input: TCurrentQrCodeInput) => void;
	onChange: (v: string, originalVal: TQrCodeContent, contentType: TQrCodeContentType) => void;
};

export const ContentSwitch = ({ currentInput, setCurrentInput, onChange }: TContentSwitchProps) => {
	return (
		<>
			<Tabs
				defaultValue={currentInput.tab}
				className="max-w-[650px]"
				suppressHydrationWarning
				// TODO optimize this
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				onValueChange={(value: any) => {
					setCurrentInput({
						value: '',
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						tab: value,
						editable: false,
					});
				}}
			>
				<TabsList className="mb-6 grid h-auto grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-4">
					<TabsTrigger value="url" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<LinkIcon className="mr-2 h-6 w-6" /> URL
						</button>
					</TabsTrigger>
					<TabsTrigger value="text" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<DocumentTextIcon className="mr-2 h-6 w-6" /> TEXT
						</button>
					</TabsTrigger>
					<TabsTrigger value="wifi" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<WifiIcon className="mr-2 h-6 w-6" /> WIFI
						</button>
					</TabsTrigger>
					<TabsTrigger value="vCard" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<IdentificationIcon className="mr-2 h-6 w-6" /> VCARD
						</button>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="url">
					<UrlSection
						value={currentInput.tab === 'url' ? currentInput.value : ''}
						editable={currentInput.tab === 'url' ? currentInput.editable : false}
						onChange={(url, editable) => {
							if (currentInput.tab !== 'url') return;
							setCurrentInput({ ...currentInput, value: url, editable });
							onChange(url, url, 'url');
						}}
					/>
				</TabsContent>
				<TabsContent value="text" className="h-full">
					<TextSection
						value={currentInput.tab === 'text' ? currentInput.value : ''}
						onChange={(v) => {
							if (currentInput.tab !== 'text') return;
							setCurrentInput({ ...currentInput, value: v });
							onChange(v, v, 'text');
						}}
					/>
				</TabsContent>
				<TabsContent value="wifi">
					<WiFiSection
						value={
							currentInput.tab === 'wifi'
								? WifiInputSchema.safeParse(currentInput.value).data!
								: WifiInputSchema.safeParse({}).data!
						}
						onChange={(v) => {
							if (currentInput.tab !== 'wifi') return;
							setCurrentInput({ ...currentInput, value: v });
							onChange(convertWiFiObjToString(v), v, 'wifi');
						}}
					/>
				</TabsContent>
				<TabsContent value="vCard">
					<VcardSection
						value={
							currentInput.tab === 'vCard'
								? VCardInputSchema.safeParse(currentInput.value).data!
								: VCardInputSchema.safeParse({}).data!
						}
						onChange={(v) => {
							if (currentInput.tab !== 'vCard') return;
							setCurrentInput({ ...currentInput, value: v });
							onChange(convertVCardObjToString(v), v, 'vCard');
						}}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
