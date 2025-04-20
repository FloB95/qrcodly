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
import { VcardSection } from './VcardSection';
import { WiFiSection } from './WiFiSection';
import { VCardInputSchema, WifiInputSchema } from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';

export const ContentSwitch = () => {
	const { content, updateContent, contentType, updateContentType } = useQrCodeGeneratorStore(
		(state) => state,
	);

	return (
		<>
			<Tabs
				defaultValue={contentType}
				className="max-w-[650px]"
				suppressHydrationWarning
				onValueChange={(value) => {
					// TODO fix this: qr code is being rendered when switching tabs
					updateContentType(value as 'url' | 'text' | 'wifi' | 'vCard');
					if (content !== '') updateContent('');
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
						value={contentType === 'url' && typeof content === 'string' ? content : ''}
						// TODO add editable prop to url section
						editable={false}
						onChange={(url) => {
							if (contentType !== 'url') return;
							updateContent(url);
						}}
					/>
				</TabsContent>
				<TabsContent value="text" className="h-full">
					<TextSection
						value={contentType === 'text' && typeof content === 'string' ? content : ''}
						onChange={(v) => {
							if (contentType !== 'text') return;
							updateContent(v);
						}}
					/>
				</TabsContent>
				<TabsContent value="wifi">
					<WiFiSection
						value={
							contentType === 'wifi'
								? WifiInputSchema.safeParse(content).data!
								: WifiInputSchema.safeParse({}).data!
						}
						onChange={(v) => {
							if (contentType !== 'wifi') return;
							updateContent(v);
						}}
					/>
				</TabsContent>
				<TabsContent value="vCard">
					<VcardSection
						value={
							contentType === 'vCard'
								? VCardInputSchema.safeParse(content).data!
								: VCardInputSchema.safeParse({}).data!
						}
						onChange={(v) => {
							if (contentType !== 'vCard') return;
							updateContent(v);
							// setCurrentInput({ ...currentInput, value: v });
							// onChange(convertVCardObjToString(v), v, 'vCard');
						}}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
