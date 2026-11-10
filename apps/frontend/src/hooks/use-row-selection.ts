'use client';

import { useCallback, useState } from 'react';

/** Selected rows of a table, by ID. Kept while paging, so a selection can span several pages. */
export function useRowSelection() {
	const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

	const toggle = useCallback(
		(id: string) =>
			setSelected((prev) => {
				const next = new Set(prev);
				if (!next.delete(id)) next.add(id);
				return next;
			}),
		[],
	);

	const setRows = useCallback(
		(ids: string[], checked: boolean) =>
			setSelected((prev) => {
				const next = new Set(prev);
				for (const id of ids) {
					if (checked) next.add(id);
					else next.delete(id);
				}
				return next;
			}),
		[],
	);

	const clear = useCallback(() => setSelected(new Set()), []);

	return { selected, toggle, setRows, clear };
}

export type TRowSelection = ReturnType<typeof useRowSelection>;
