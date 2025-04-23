import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, StarIcon } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListConfigTemplatesQuery } from "@/lib/api/config-template";
import type {
	TConfigTemplate,
	TCreateConfigTemplateDto,
} from "@shared/schemas";
import { useQrCodeGeneratorStore } from "@/components/provider/QrCodeConfigStoreProvider";
import { TemplatesList } from "../TemplatesList";
import { useTranslations } from "next-intl";

export const MyTemplatesTab = () => {
	const t = useTranslations("templates");
	const { config, updateConfig } = useQrCodeGeneratorStore((state) => state);
	const [searchName, setSearchName] = useState<string>("");
	const [debouncedSearchName] = useDebouncedValue(searchName, 500);

	const { isLoading, data: configTemplates } =
		useListConfigTemplatesQuery(debouncedSearchName);

	const handleSelect = (
		template: TCreateConfigTemplateDto | TConfigTemplate,
	) => {
		updateConfig({
			...config,
			...template.config,
		});
	};

	if (isLoading) {
		return (
			<div className="mt-20 flex flex-col items-center justify-center text-center">
				<Loader2 className="mr-2 h-12 w-12 animate-spin" />
			</div>
		);
	}

	if (
		searchName == "" &&
		configTemplates &&
		configTemplates.data.length === 0
	) {
		return (
			<div className="mt-20 flex flex-col items-center justify-center text-center">
				<StarIcon className="h-12 w-12" />
				<p className="text-md mt-4 text-center">{t("noTemplates")}</p>
			</div>
		);
	}

	if (
		searchName != "" &&
		configTemplates &&
		configTemplates.data.length === 0
	) {
		return (
			<div>
				<Input
					value={searchName}
					className="mb-5"
					placeholder={t("search.placeholder")}
					onChange={(e) => setSearchName(e.target.value)}
				/>
				<div className="mt-20 flex flex-col items-center justify-center text-center">
					<StarIcon className="h-12 w-12" />
					<p className="text-md mt-4 text-center">
						{t("search.noResults", {
							searchName,
						})}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div>
			<Input
				value={searchName}
				className="mb-5"
				placeholder={t("search.placeholder")}
				onChange={(e) => setSearchName(e.target.value)}
			/>
			<TemplatesList
				templates={configTemplates?.data ?? []}
				onSelect={handleSelect}
				deletable={true}
			/>
		</div>
	);
};
