'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@clerk/nextjs';
import { MyTemplatesTab } from './tabs/MyTemplatesTab';
import { PredefinedTemplatesTab } from './tabs/PredefinedTemplatesTab';

export const TemplateTabs = () => {
	const { isSignedIn } = useAuth();

	return (
		<div className="xl:w-2/3">
			<Tabs defaultValue={isSignedIn ? 'myTemplates' : 'predefinedTemplates'} className="w-full">
				<TabsList className="mb-4 w-full">
					{isSignedIn && (
						<TabsTrigger className="flex-1" value="myTemplates">
							My Templates
						</TabsTrigger>
					)}
					<TabsTrigger className="flex-1" value="predefinedTemplates">
						Predefined
					</TabsTrigger>
				</TabsList>
				{isSignedIn && (
					<TabsContent value="myTemplates" className="mt-0">
						<MyTemplatesTab />
					</TabsContent>
				)}
				<TabsContent value="predefinedTemplates" className="mt-0">
					<PredefinedTemplatesTab />
				</TabsContent>
			</Tabs>
		</div>
	);
};
