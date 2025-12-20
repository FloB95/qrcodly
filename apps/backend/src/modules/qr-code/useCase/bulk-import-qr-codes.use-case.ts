/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { inject, injectable } from 'tsyringe';
import { QrCodeContent, TBulkImportQrCodeDto, TQrCodeContentType } from '@shared/schemas';
import { CreateQrCodeUseCase } from './create-qr-code.use-case';
import { Logger } from '@/core/logging';
import { $ZodError } from 'zod/v4/core';
import { ZodObject } from 'zod';
import { BulkUrlCsvDto } from '../domain/dtos/BulkUrlCsvDto';
import { BulkToManyQrCodesError } from '../error/http/bulk-to-many-qr-codes.error';
import { parse } from 'csv-parse/sync';
import { MAX_QR_CODE_CSV_UPLOADS } from '@/core/config/constants';
import { sleep } from '@/utils/general';
import { BulkTextCsvDto } from '../domain/dtos/BulkTextCsvDto';
import { BulkWifiCsvDto } from '../domain/dtos/BulkWifiCsvDto';
import { BulkVCardCsvDto } from '../domain/dtos/BulkVCardCsvDto';
import { BadRequestError, CustomApiError } from '@/core/error/http';
import { TQrCodeWithRelations } from '../domain/entities/qr-code.entity';

@injectable()
export class BulkImportQrCodesUseCase {
	private readonly columnMap: Record<
		TQrCodeContentType,
		{
			columns: string[];
			schema: ZodObject;
		}
	> = {
		url: {
			columns: ['url', 'name', 'isEditable'],
			schema: BulkUrlCsvDto,
		},
		text: {
			columns: ['text', 'name'],
			schema: BulkTextCsvDto,
		},
		wifi: {
			columns: ['ssid', 'password', 'encryption', 'name'],
			schema: BulkWifiCsvDto,
		},
		vCard: {
			columns: [
				'name',
				'firstName',
				'lastName',
				'email',
				'phone',
				'fax',
				'company',
				'job',
				'street',
				'city',
				'zip',
				'state',
				'country',
				'website',
			],
			schema: BulkVCardCsvDto,
		},
	};

	constructor(
		@inject(CreateQrCodeUseCase) private readonly createQrCodeUseCase: CreateQrCodeUseCase,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(dto: TBulkImportQrCodeDto, userId: string): Promise<TQrCodeWithRelations[]> {
		const createdQrCodes: TQrCodeWithRelations[] = [];
		const { contentType, file, config } = dto;

		const csvString = await this.readFile(file);
		const { validRecords, validationErrors } = this.parseAndValidateCsv(csvString, contentType);

		if (validationErrors.length) {
			throw new BadRequestError(
				`Error parsing CSV File in line: ${validationErrors[0].line}`,
				validationErrors[0].error,
			);
		}

		this.logger.info('bulk.import.records', {
			contentType,
			items: validRecords.length,
			userId,
		});

		for (const record of validRecords) {
			createdQrCodes.push(
				await this.createQrCodeUseCase.execute(
					{
						name: record.name,
						config,
						content: QrCodeContent.parse({
							type: contentType,
							data: contentType === 'text' ? record?.text : record,
						}),
					},
					userId,
				),
			);

			// TODO update create use case process and short url reservation process
			await sleep(50);
		}

		return createdQrCodes;
	}

	private async readFile(file: File): Promise<string> {
		const buffer = await file.arrayBuffer();
		return Buffer.from(buffer).toString('utf-8');
	}

	private parseAndValidateCsv(
		csvString: string,
		contentType: TQrCodeContentType,
	): {
		validRecords: any[];
		validationErrors: { line: number; error: $ZodError }[];
	} {
		try {
			const validRecords: any[] = [];
			const errors: { line: number; error: $ZodError }[] = [];

			const rawRecords = parse(csvString, {
				from_line: 2,
				skip_empty_lines: true,
				delimiter: ';',
				columns: this.columnMap[contentType].columns,
			});

			// TODO implement plan policy handling
			if (rawRecords.length > MAX_QR_CODE_CSV_UPLOADS) {
				throw new BulkToManyQrCodesError(rawRecords.length, MAX_QR_CODE_CSV_UPLOADS);
			}

			rawRecords.forEach((record, index) => {
				try {
					const parsed = this.columnMap[contentType].schema.parse(record);
					validRecords.push(parsed);
				} catch (error) {
					if (error instanceof $ZodError) {
						errors.push({
							line: index + 2,
							error,
						});
					} else {
						throw error;
					}
				}
			});

			return { validRecords, validationErrors: errors };
		} catch (error) {
			if (error instanceof CustomApiError) throw error;

			const e = error as any;
			throw new BadRequestError(e.message);
		}
	}
}
