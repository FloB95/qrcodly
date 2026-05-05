import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TQrCodeWithRelationsResponseDto, TTagResponseDto } from '@shared/schemas';
import { ApiError, blobToDataUrl, QrcodlyApi } from '../lib/api-client';
import { getAutoPlaceSizeMm, placePngInActiveDocument, PRINT_QR_PX } from '../lib/indesign';
import { BrandHeader } from '../components/Logo';
import { Button } from '../components/Button';
import { QrPreview } from '../components/QrPreview';

type Props = {
	apiKey: string;
	onSignOut: () => void;
	onCreate: () => void;
};

const PAGE_SIZE = 20;
const TAG_PILL_THRESHOLD = 8;

export function ListScreen({ apiKey, onSignOut, onCreate }: Props) {
	const api = useMemo(() => new QrcodlyApi(apiKey), [apiKey]);

	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [activeTagId, setActiveTagId] = useState<string | null>(null);

	const [tags, setTags] = useState<TTagResponseDto[]>([]);
	const [qrCodes, setQrCodes] = useState<TQrCodeWithRelationsResponseDto[]>([]);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [insertingId, setInsertingId] = useState<string | null>(null);

	const scrollRef = useRef<HTMLDivElement>(null);
	const loadingMoreRef = useRef(false);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
		return () => clearTimeout(t);
	}, [search]);

	// Load tags once
	useEffect(() => {
		api
			.listTags()
			.then((r) => setTags(r.data))
			.catch(() => {
				/* non-fatal */
			});
	}, [api]);

	const loadPage = useCallback(
		async (requestedPage: number, append: boolean) => {
			if (loadingMoreRef.current) return;
			loadingMoreRef.current = true;
			if (append) setLoadingMore(true);
			else setLoading(true);
			setError(null);

			try {
				const res = await api.listQrCodes({
					page: requestedPage,
					limit: PAGE_SIZE,
					search: debouncedSearch || undefined,
					tagIds: activeTagId ? [activeTagId] : undefined,
				});
				setTotal(res.total);
				setQrCodes((prev) => (append ? [...prev, ...res.data] : res.data));
				setPage(requestedPage);
			} catch (err) {
				if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
					setError('API key invalid. Please re-connect.');
				} else {
					setError(err instanceof Error ? err.message : 'Failed to load');
				}
			} finally {
				setLoading(false);
				setLoadingMore(false);
				loadingMoreRef.current = false;
			}
		},
		[api, debouncedSearch, activeTagId],
	);

	// Reload list when search or tag changes
	useEffect(() => {
		void loadPage(1, false);
	}, [loadPage]);

	// Infinite scroll via scroll listener
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const onScroll = () => {
			const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
			const hasMore = qrCodes.length < total;
			if (nearBottom && hasMore && !loadingMoreRef.current) {
				void loadPage(page + 1, true);
			}
		};
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => el.removeEventListener('scroll', onScroll);
	}, [loadPage, page, qrCodes.length, total]);

	const handleInsert = async (qr: TQrCodeWithRelationsResponseDto) => {
		if (!qr.qrCodeData) {
			setError('This QR has no encodable data yet.');
			return;
		}
		setInsertingId(qr.id);
		setError(null);
		try {
			const blob = await api.renderQrPng({
				config: qr.config,
				data: qr.qrCodeData,
				sizePx: PRINT_QR_PX,
				printSizeMm: getAutoPlaceSizeMm(),
			});
			const dataUrl = await blobToDataUrl(blob);
			await placePngInActiveDocument(dataUrl, qr.name ?? qr.id);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Insert failed');
		} finally {
			setInsertingId(null);
		}
	};

	const showTagDropdown = tags.length > TAG_PILL_THRESHOLD;

	return (
		<div className="app">
			<div className="header">
				<BrandHeader />
				<div className="actions">
					<Button onClick={onCreate}>New</Button>
					<Button onClick={onSignOut} className="ml-6">
						Sign out
					</Button>
				</div>
			</div>

			<div className="field">
				<input
					className="input"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search QR codes…"
				/>
			</div>

			{tags.length > 0 && (
				<div className="field">
					{showTagDropdown ? (
						<select
							className="input"
							value={activeTagId ?? ''}
							onChange={(e) => setActiveTagId(e.target.value || null)}
						>
							<option value="">All tags</option>
							{tags.map((tag) => (
								<option key={tag.id} value={tag.id}>
									{tag.name}
								</option>
							))}
						</select>
					) : (
						<div className="tag-row">
							<Button
								variant={activeTagId === null ? 'primary' : 'default'}
								onClick={() => setActiveTagId(null)}
								className="tag-btn"
							>
								All
							</Button>
							{tags.map((tag) => (
								<Button
									key={tag.id}
									variant={activeTagId === tag.id ? 'primary' : 'default'}
									onClick={() => setActiveTagId(activeTagId === tag.id ? null : tag.id)}
									className="tag-btn"
								>
									{tag.name}
								</Button>
							))}
						</div>
					)}
				</div>
			)}

			{error && <p className="error">{error}</p>}

			<p className="muted hint">
				Click a QR to auto-size it to your page, or pre-select a frame to fit it.
			</p>

			<div className="scroll" ref={scrollRef}>
				{loading ? (
					<p className="muted">Loading…</p>
				) : qrCodes.length === 0 ? (
					<p className="muted">No QR codes found.</p>
				) : (
					<>
						{qrCodes.map((qr) => (
							<div
								key={qr.id}
								className="qr-row"
								role="button"
								tabIndex={0}
								onClick={() => handleInsert(qr)}
								style={{ opacity: insertingId === qr.id ? 0.5 : 1 }}
							>
								<div className="preview">
									<QrPreview
										api={api}
										config={qr.config}
										data={qr.qrCodeData ?? undefined}
										sizePx={200}
									/>
								</div>
								<div className="meta">
									<div className="name">{qr.name ?? 'Untitled'}</div>
									<div className="type">{qr.content.type}</div>
								</div>
							</div>
						))}
						{loadingMore && <p className="muted">Loading more…</p>}
						{!loadingMore && qrCodes.length >= total && total > PAGE_SIZE && (
							<p className="muted">End of list · {total} total</p>
						)}
					</>
				)}
			</div>
		</div>
	);
}
