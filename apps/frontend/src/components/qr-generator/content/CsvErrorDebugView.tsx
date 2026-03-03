'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';
import type { CsvRowError } from '@/lib/csv-validation';

type CsvErrorDebugViewProps = {
	errors: CsvRowError[];
	expectedColumns: string[];
	onRetry: () => void;
	onBack: () => void;
};

export const CsvErrorDebugView = ({
	errors,
	expectedColumns,
	onRetry,
	onBack,
}: CsvErrorDebugViewProps) => {
	const t = useTranslations('generator.bulkImport.csvErrors');

	const getFieldErrors = (error: CsvRowError, column: string): string[] => {
		return error.fieldErrors.filter((fe) => fe.column === column).map((fe) => fe.message);
	};

	const getGeneralErrors = (error: CsvRowError): string[] => {
		return error.fieldErrors.filter((fe) => fe.column === '').map((fe) => fe.message);
	};

	return (
		<div className="space-y-3 sm:space-y-4 mt-4">
			<Alert variant="destructive">
				<ExclamationTriangleIcon className="h-4 w-4" />
				<AlertTitle>{t('title')}</AlertTitle>
				<AlertDescription>{t('description', { count: errors.length })}</AlertDescription>
			</Alert>

			<div className="space-y-1.5">
				<p className="text-sm font-medium">{t('expectedFormat')}</p>
				<div className="flex flex-wrap gap-1 sm:gap-1.5 items-center">
					{expectedColumns.map((col, i) => (
						<span key={col} className="flex items-center gap-1 sm:gap-1.5">
							<Badge variant="secondary" className="text-[11px] sm:text-xs">
								{col}
							</Badge>
							{i < expectedColumns.length - 1 && (
								<span className="text-muted-foreground text-xs">;</span>
							)}
						</span>
					))}
				</div>
				<p className="text-[11px] sm:text-xs text-muted-foreground">{t('delimiterHint')}</p>
			</div>

			<div className="-mx-4 sm:mx-0 overflow-x-auto sm:rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12 sm:w-16 text-xs">{t('lineHeader')}</TableHead>
							{expectedColumns.map((col) => (
								<TableHead key={col} className="text-xs whitespace-nowrap">
									{col}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{errors.map((error) => {
							const generalErrors = getGeneralErrors(error);
							const hasColumnMismatch = generalErrors.length > 0;

							return (
								<TableRow key={error.line}>
									<TableCell className="font-mono text-xs">{error.line}</TableCell>
									{hasColumnMismatch ? (
										<TableCell colSpan={expectedColumns.length} className="text-destructive">
											<div>
												{error.rawValues.length > 0 ? (
													<code className="text-[11px] sm:text-xs break-all">
														{error.rawValues.join(' ; ')}
													</code>
												) : null}
											</div>
											{generalErrors.map((msg, i) => (
												<p key={i} className="text-[11px] sm:text-xs mt-1">
													{msg}
												</p>
											))}
										</TableCell>
									) : (
										expectedColumns.map((col, idx) => {
											const fieldErrors = getFieldErrors(error, col);
											const value = error.rawValues[idx] ?? '';
											const hasError = fieldErrors.length > 0;

											return (
												<TableCell key={col}>
													<div className={hasError ? 'text-destructive' : ''}>
														<span className="text-[11px] sm:text-xs break-all">
															{value || <span className="text-muted-foreground italic">empty</span>}
														</span>
														{fieldErrors.map((msg, i) => (
															<p key={i} className="text-[11px] sm:text-xs mt-0.5 font-medium">
																{msg}
															</p>
														))}
													</div>
												</TableCell>
											);
										})
									)}
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			<div className="mt-2 flex flex-col xs:flex-row gap-2">
				<Button className="w-full xs:w-auto" onClick={onRetry}>
					{t('retryButton')}
				</Button>
				<Button className="w-full xs:w-auto" variant="outlineStrong" onClick={onBack}>
					{t('backButton')}
				</Button>
			</div>
		</div>
	);
};
