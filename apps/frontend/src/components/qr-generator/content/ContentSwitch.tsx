import { buttonVariants } from "@/components/ui/button";
import {
	DocumentTextIcon,
	LinkIcon,
	WifiIcon,
	IdentificationIcon,
} from "@heroicons/react/24/outline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlSection } from "./UrlSection";
import { TextSection } from "./TextSection";
import { VcardSection } from "./VcardSection";
import { WiFiSection } from "./WiFiSection";
import {
	getDefaultContentByType,
	type TQrCodeContentType,
	type TTextInput,
	type TUrlInput,
	type TVCardInput,
	type TWifiInput,
} from "@shared/schemas";
import { useQrCodeGeneratorStore } from "@/components/provider/QrCodeConfigStoreProvider";

export const ContentSwitch = () => {
	const { content, updateContent } = useQrCodeGeneratorStore((state) => state);

	return (
		<>
			<Tabs
				defaultValue={content.type}
				className="max-w-[650px]"
				suppressHydrationWarning
				onValueChange={(value) => {
					updateContent(getDefaultContentByType(value as TQrCodeContentType));
				}}
			>
				<TabsList className="mb-6 grid h-auto grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
					<TabsTrigger value="url" asChild>
						<button
							className={buttonVariants({
								variant: "tab",
							})}
						>
							<LinkIcon className="mr-2 h-6 w-6" /> URL
						</button>
					</TabsTrigger>
					<TabsTrigger value="text" asChild>
						<button
							className={buttonVariants({
								variant: "tab",
							})}
						>
							<DocumentTextIcon className="mr-2 h-6 w-6" /> TEXT
						</button>
					</TabsTrigger>
					<TabsTrigger value="wifi" asChild>
						<button
							className={buttonVariants({
								variant: "tab",
							})}
						>
							<WifiIcon className="mr-2 h-6 w-6" /> WIFI
						</button>
					</TabsTrigger>
					<TabsTrigger value="vCard" asChild>
						<button
							className={buttonVariants({
								variant: "tab",
							})}
						>
							<IdentificationIcon className="mr-2 h-6 w-6" /> VCARD
						</button>
					</TabsTrigger>
				</TabsList>
				<TabsContent value="url">
					<UrlSection
						value={content.data as TUrlInput}
						onChange={(v) => {
							updateContent({
								type: "url",
								data: v,
							});
						}}
					/>
				</TabsContent>
				<TabsContent value="text" className="h-full">
					<TextSection
						value={content.data as TTextInput}
						onChange={(v) => {
							updateContent({
								type: "text",
								data: v,
							});
						}}
					/>
				</TabsContent>
				<TabsContent value="wifi">
					<WiFiSection
						value={content.data as TWifiInput}
						onChange={(v) => {
							updateContent({
								type: "wifi",
								data: v,
							});
						}}
					/>
				</TabsContent>
				<TabsContent value="vCard">
					<VcardSection
						value={content.data as TVCardInput}
						onChange={(v) => {
							updateContent({
								type: "vCard",
								data: v,
							});
						}}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
