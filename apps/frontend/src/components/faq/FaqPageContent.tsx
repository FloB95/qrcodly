'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FaqCategorySection, type FaqItem } from './FaqCategorySection';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export interface FaqCategory {
	key: string;
	label: string;
	items: FaqItem[];
}

export function FaqPageContent({
	categories,
	allLabel,
	searchPlaceholder,
	noResults,
}: {
	categories: FaqCategory[];
	allLabel: string;
	searchPlaceholder: string;
	noResults: string;
}) {
	const [search, setSearch] = useState('');
	const [activeTab, setActiveTab] = useState('all');
	const [hashItemId, setHashItemId] = useState<string | undefined>(undefined);

	useEffect(() => {
		const hash = window.location.hash.slice(1);
		if (hash) {
			setHashItemId(hash);
			// Find which category contains this item and switch to it
			for (const cat of categories) {
				if (cat.items.some((item) => item.id === hash)) {
					setActiveTab(cat.key);
					break;
				}
			}
			// Scroll to the element after a short delay
			setTimeout(() => {
				document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}, 300);
		}
	}, [categories]);

	const filteredCategories = useMemo(() => {
		const query = search.toLowerCase().trim();
		const filtered = categories
			.map((cat) => ({
				...cat,
				items: query
					? cat.items.filter(
							(item) =>
								item.question.toLowerCase().includes(query) ||
								item.answer.toLowerCase().includes(query),
						)
					: cat.items,
			}))
			.filter((cat) => cat.items.length > 0);

		if (activeTab === 'all') return filtered;
		return filtered.filter((cat) => cat.key === activeTab);
	}, [search, activeTab, categories]);

	const totalResults = filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0);

	return (
		<div className="max-w-4xl mx-auto">
			{/* Search */}
			<div className="relative mb-8">
				<MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
				<Input
					type="text"
					placeholder={searchPlaceholder}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-10"
				/>
			</div>

			{/* Category Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
				<TabsList className="w-full overflow-x-auto flex-nowrap justify-start h-auto p-1">
					<TabsTrigger value="all" className="shrink-0">
						{allLabel}
					</TabsTrigger>
					{categories.map((cat) => (
						<TabsTrigger key={cat.key} value={cat.key} className="shrink-0">
							{cat.label}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			{/* FAQ Cards */}
			{totalResults === 0 ? (
				<p className="text-center text-muted-foreground py-12">{noResults}</p>
			) : (
				<section className="flex flex-col gap-6">
					{filteredCategories.map((cat, i) => (
						<FaqCategorySection
							key={cat.key}
							title={cat.label}
							items={cat.items}
							openItemId={hashItemId}
							delay={i * 0.08}
						/>
					))}
				</section>
			)}
		</div>
	);
}
