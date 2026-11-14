import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ArrowDownOnSquareIcon,
	ArrowRightStartOnRectangleIcon,
	MagnifyingGlassIcon,
	PlusIcon,
	QrCodeIcon,
} from '@heroicons/react/24/outline';
import type { TQrCodeWithRelationsResponseDto, TTagResponseDto } from '@shared/schemas';
import type { InsertFormat } from '../../shared/messages';
import { ApiError, QrcodlyApi } from '../lib/api-client';
import { CONTENT_TYPES, isDynamicQrCode } from '../lib/content-types';
import { insertQrCode } from '../lib/insert';
import { BrandHeader } from '../components/Logo';
import { PlacementHint } from '../components/PlacementHint';
import { QrPreview } from '../components/QrPreview';
import { Spinner } from '../components/Spinner';

type Props = {
	apiKey: string;
	insertFormat: InsertFormat;
	onInsertFormatChange: (format: InsertFormat) => void;
	onSignOut: () => void;
	onCreate: () => void;
};

const PAGE_SIZE = 20;
const TAG_PILL_THRESHOLD = 8;
const SKELETON_CARDS = 6;

export function ListScreen({
	apiKey,
	insertFormat,
	onInsertFormatChange,
	onSignOut,
	onCreate,
}: Props) {
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
	// Bumped by every filter reload so responses for an older filter are dropped.
	const generationRef = useRef(0);

	useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
		return () => clearTimeout(t);
	}, [search]);

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
			if (append && loadingMoreRef.current) return;
			const generation = append ? generationRef.current : ++generationRef.current;
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
				if (generation !== generationRef.current) return;
				setTotal(res.total);
				setQrCodes((prev) => (append ? [...prev, ...res.data] : res.data));
				setPage(requestedPage);
			} catch (err) {
				if (generation !== generationRef.current) return;
				if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
					setError('Your API key is no longer valid. Disconnect and connect a new one.');
				} else {
					setError(err instanceof Error ? err.message : 'Failed to load');
				}
			} finally {
				if (generation === generationRef.current) {
					setLoading(false);
					setLoadingMore(false);
					loadingMoreRef.current = false;
				}
			}
		},
		[api, debouncedSearch, activeTagId],
	);

	useEffect(() => {
		void loadPage(1, false);
	}, [loadPage]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const onScroll = () => {
			const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
			const hasMore = qrCodes.length < total;
			if (nearBottom && hasMore && !loadingMoreRef.current) {
				void loadPage(page + 1, true);
			}
		};
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => el.removeEventListener('scroll', onScroll);
	}, [loadPage, page, qrCodes.length, total]);

	const handleInsert = async (qr: TQrCodeWithRelationsResponseDto) => {
		setInsertingId(qr.id);
		setError(null);
		try {
			await insertQrCode(api, qr, insertFormat);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Insert failed');
		} finally {
			setInsertingId(null);
		}
	};

	const isFiltered = Boolean(debouncedSearch || activeTagId);
	const showTagDropdown = tags.length > TAG_PILL_THRESHOLD;

	return (
		<div className="app">
			<header className="topbar">
				<BrandHeader />
				<div className="topbar-actions">
					<button type="button" className="btn btn-primary btn-sm" onClick={onCreate}>
						<PlusIcon />
						New
					</button>
					<button
						type="button"
						className="icon-btn"
						onClick={onSignOut}
						aria-label="Disconnect API key"
						title="Disconnect API key"
					>
						<ArrowRightStartOnRectangleIcon />
					</button>
				</div>
			</header>

			<div className="toolbar">
				<div className="input-group">
					<MagnifyingGlassIcon className="input-icon" />
					<input
						className="input has-icon"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search QR codes…"
						type="search"
					/>
				</div>

				{tags.length > 0 &&
					(showTagDropdown ? (
						<select
							className="input select"
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
						<div className="chips">
							<button
								type="button"
								className={activeTagId === null ? 'chip is-active' : 'chip'}
								onClick={() => setActiveTagId(null)}
							>
								All
							</button>
							{tags.map((tag) => (
								<button
									key={tag.id}
									type="button"
									className={activeTagId === tag.id ? 'chip is-active' : 'chip'}
									onClick={() => setActiveTagId(activeTagId === tag.id ? null : tag.id)}
								>
									<span className="chip-dot" style={{ background: tag.color }} />
									{tag.name}
								</button>
							))}
						</div>
					))}

				<PlacementHint />
				{error && <p className="alert">{error}</p>}
			</div>

			<div className="scroll" ref={scrollRef}>
				{loading ? (
					<div className="grid">
						{Array.from({ length: SKELETON_CARDS }, (_, i) => (
							<div key={i} className="qr-card is-skeleton">
								<span className="qr-card-preview">
									<span className="qr-preview is-loading" />
								</span>
								<span className="qr-card-meta">
									<span className="skeleton-line" />
									<span className="skeleton-line is-short" />
								</span>
							</div>
						))}
					</div>
				) : qrCodes.length === 0 ? (
					!error && (
						<div className="empty">
							<span className="empty-icon">
								<QrCodeIcon />
							</span>
							{isFiltered ? (
								<p>No QR codes match your filter.</p>
							) : (
								<>
									<p>You don't have any QR codes yet.</p>
									<button type="button" className="btn btn-primary btn-sm" onClick={onCreate}>
										<PlusIcon />
										Create your first
									</button>
								</>
							)}
						</div>
					)
				) : (
					<>
						<div className="grid">
							{qrCodes.map((qr) => {
								const type = CONTENT_TYPES[qr.content.type];
								const inserting = insertingId === qr.id;
								return (
									<button
										key={qr.id}
										type="button"
										className={inserting ? 'qr-card is-busy' : 'qr-card'}
										onClick={() => handleInsert(qr)}
										disabled={insertingId !== null}
										title={`Insert “${qr.name ?? 'Untitled'}”`}
									>
										<span className="qr-card-preview">
											<QrPreview api={api} config={qr.config} data={qr.qrCodeData} />
											<span className="qr-card-overlay">
												{inserting ? <Spinner /> : <ArrowDownOnSquareIcon />}
												{inserting ? 'Inserting…' : 'Insert'}
											</span>
										</span>
										<span className="qr-card-meta">
											<span className="qr-card-name">{qr.name ?? 'Untitled'}</span>
											<span className="qr-card-type">
												<type.icon />
												{type.label}
												{isDynamicQrCode(qr) && <span className="dynamic-pill">Dynamic</span>}
											</span>
										</span>
									</button>
								);
							})}
						</div>
						{loadingMore && (
							<p className="list-status">
								<Spinner /> Loading more…
							</p>
						)}
					</>
				)}
			</div>

			<footer className="footer">
				<span className="footer-count">
					{loading ? '' : `${total} QR code${total === 1 ? '' : 's'}`}
				</span>
				<div className="segmented" role="radiogroup" aria-label="Insert as">
					<span className="segmented-label">Insert as</span>
					{(
						[
							['svg', 'Vector'],
							['png', 'PNG'],
						] as const
					).map(([format, label]) => (
						<button
							key={format}
							type="button"
							role="radio"
							aria-checked={insertFormat === format}
							className={insertFormat === format ? 'segment is-active' : 'segment'}
							onClick={() => onInsertFormatChange(format)}
						>
							{label}
						</button>
					))}
				</div>
			</footer>
		</div>
	);
}
