'use client';

import { Button, buttonVariants } from '@/components/ui/button';
import {
	DocumentTextIcon,
	LinkIcon,
	WifiIcon,
	IdentificationIcon,
	DocumentArrowUpIcon,
	AtSymbolIcon,
	MapPinIcon,
	CalendarDaysIcon,
	EnvelopeOpenIcon,
} from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlSection } from './UrlSection';
import { TextSection } from './TextSection';
import { VCardSection } from './VcardSection';
import { WiFiSection } from './WiFiSection';
import {
	getDefaultContentByType,
	type TEmailInput,
	type TEventInput,
	type TLocationInput,
	type TQrCodeContentType,
	type TSocialInput,
	type TTextInput,
	type TUrlInput,
	type TVCardInput,
	type TWifiInput,
} from '@shared/schemas';
import { useQrCodeGeneratorStore } from '@/components/provider/QrCodeConfigStoreProvider';
import { useTranslations } from 'next-intl';
import { EditUrlSection } from './EditUrlSection';
import { BulkImport } from './BulkImport';
import { Badge } from '@/components/ui/badge';
import { EmailSection } from './EmailSection';
import { LocationSection } from './LocationSection';
import { EventSection } from './EventSection';
import { SocialSection } from './SocialSection';

type ContentSwitchProps = {
	hideContentUrlTab?: boolean;
	hideContentTextTab?: boolean;
	hideContentWifiTab?: boolean;
	hideContentVCardTab?: boolean;
	hideContentEmailTab?: boolean;
	hideContentLocationTab?: boolean;
	hideContentEventTab?: boolean;
	hideContentSocialsTab?: boolean;
	isEditMode?: boolean;
};

export const ContentSwitch = ({
	hideContentUrlTab,
	hideContentTextTab,
	hideContentWifiTab,
	hideContentVCardTab,
	hideContentEmailTab,
	hideContentLocationTab,
	hideContentEventTab,
	hideContentSocialsTab,
	isEditMode,
}: ContentSwitchProps) => {
	const t = useTranslations('generator.contentSwitch');
	const t2 = useTranslations('general');
	const { content, updateContent, bulkMode, updateBulkMode } = useQrCodeGeneratorStore(
		(state) => state,
	);
	return (
		<Tabs
			defaultValue={content.type}
			className="max-w-[650px]"
			suppressHydrationWarning
			onValueChange={(value) => {
				updateContent(getDefaultContentByType(value as TQrCodeContentType));
			}}
		>
			<TabsList
				className={`${isEditMode ? 'mb-6' : 'mb-3 '} grid h-auto grid-cols-2 gap-2 bg-transparent p-0 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-4`}
			>
				{!hideContentUrlTab && (
					<TabsTrigger value="url" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<LinkIcon className="mr-2 h-6 w-6" /> {t('tab.url')}
						</button>
					</TabsTrigger>
				)}
				{!hideContentTextTab && (
					<TabsTrigger value="text" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<DocumentTextIcon className="mr-2 h-6 w-6" /> {t('tab.text')}
						</button>
					</TabsTrigger>
				)}
				{!hideContentWifiTab && (
					<TabsTrigger value="wifi" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<WifiIcon className="mr-2 h-6 w-6" /> {t('tab.wifi')}
						</button>
					</TabsTrigger>
				)}
				{!hideContentVCardTab && (
					<TabsTrigger value="vCard" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<IdentificationIcon className="mr-2 h-6 w-6" /> {t('tab.vCard')}
						</button>
					</TabsTrigger>
				)}

				{!hideContentEmailTab && (
					<TabsTrigger value="email" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<EnvelopeOpenIcon className="mr-2 h-6 w-6" /> {t('tab.email')}
						</button>
					</TabsTrigger>
				)}

				{!hideContentLocationTab && (
					<TabsTrigger value="location" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<MapPinIcon className="mr-2 h-6 w-6" /> {t('tab.location')}
						</button>
					</TabsTrigger>
				)}

				{!hideContentEventTab && (
					<TabsTrigger value="event" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<CalendarDaysIcon className="mr-2 h-6 w-6" /> {t('tab.event')}
						</button>
					</TabsTrigger>
				)}

				{!hideContentSocialsTab && (
					<TabsTrigger value="socials" asChild>
						<button
							className={buttonVariants({
								variant: 'tab',
							})}
						>
							<AtSymbolIcon className="mr-2 h-6 w-6" /> {t('tab.socials')}
						</button>
					</TabsTrigger>
				)}
			</TabsList>
			{!isEditMode && (
				<div className="flex flex-row-reverse cursor-pointer pt-1">
					{bulkMode.isBulkMode ? (
						<Button variant="link" onClick={() => updateBulkMode(false, undefined)}>
							{t('cancel')}
						</Button>
					) : (
						<div className="relative flex mb-2 align-middle">
							<Button
								className="p-0"
								variant="link"
								onClick={() => updateBulkMode(true, undefined)}
							>
								<DocumentArrowUpIcon className="w-6 h-6 mr-1.5" /> {t('bulkModeBtn')}
							</Button>
							<div className="mt-1.5 ml-2">
								<Badge className="cursor-default hidden xs:block">{t2('newBadge')}</Badge>
							</div>
						</div>
					)}
				</div>
			)}

			{bulkMode.isBulkMode ? (
				<BulkImport contentType={content.type} />
			) : (
				<>
					{!hideContentUrlTab && (
						<TabsContent value="url">
							{isEditMode ? (
								<EditUrlSection
									value={content.data as TUrlInput}
									onChange={(v) => {
										updateContent({
											type: 'url',
											data: v,
										});
									}}
								/>
							) : (
								<UrlSection
									value={content.data as TUrlInput}
									onChange={(v) => {
										updateContent({
											type: 'url',
											data: v,
										});
									}}
								/>
							)}
						</TabsContent>
					)}
					{!hideContentTextTab && (
						<TabsContent value="text" className="h-full">
							<TextSection
								value={content.data as TTextInput}
								onChange={(v) => {
									updateContent({
										type: 'text',
										data: v,
									});
								}}
							/>
						</TabsContent>
					)}
					{!hideContentWifiTab && (
						<TabsContent value="wifi">
							<WiFiSection
								value={content.data as TWifiInput}
								onChange={(v) => {
									updateContent({
										type: 'wifi',
										data: v,
									});
								}}
							/>
						</TabsContent>
					)}
					{!hideContentVCardTab && (
						<TabsContent value="vCard">
							<VCardSection
								value={content.data as TVCardInput}
								onChange={(v) => {
									updateContent({
										type: 'vCard',
										data: v,
									});
								}}
							/>
						</TabsContent>
					)}

					{!hideContentEmailTab && (
						<TabsContent value="email">
							<EmailSection
								value={content.data as TEmailInput}
								onChange={(v) => {
									updateContent({
										type: 'email',
										data: v,
									});
								}}
							/>
						</TabsContent>
					)}

					{!hideContentLocationTab && (
						<TabsContent value="location">
							<LocationSection
								value={content.data as TLocationInput}
								onChange={(v) => {
									updateContent({
										type: 'location',
										data: v,
									});
								}}
							/>
						</TabsContent>
					)}

					{!hideContentEventTab && (
						<TabsContent value="event">
							<EventSection
								value={content.data as TEventInput}
								onChange={(v) => {
									updateContent({
										type: 'event',
										data: v,
									});
								}}
							/>
						</TabsContent>
					)}

					{!hideContentSocialsTab && (
						<TabsContent value="socials">
							<SocialSection
								value={content.data as TSocialInput}
								onChange={(v) => {
									updateContent({
										type: 'socials',
										data: v,
									});
								}}
							/>
						</TabsContent>
					)}
				</>
			)}
		</Tabs>
	);
};
