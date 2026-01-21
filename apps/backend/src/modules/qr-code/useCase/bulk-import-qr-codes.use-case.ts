/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { inject, injectable } from 'tsyringe';
import { QrCodeContent, TBulkImportQrCodeDto, TQrCodeContentType } from '@shared/schemas';
import { CreateQrCodeUseCase } from './create-qr-code.use-case';
import { Logger } from '@/core/logging';
import { $ZodError } from 'zod/v4/core';
import { ZodObject } from 'zod';
import { BulkUrlCsvDto } from '../domain/dtos/BulkUrlCsvDto';
import { parse } from 'csv-parse/sync';
import { sleep } from '@/utils/general';
import { BulkTextCsvDto } from '../domain/dtos/BulkTextCsvDto';
import { BulkWifiCsvDto } from '../domain/dtos/BulkWifiCsvDto';
import { BulkVCardCsvDto } from '../domain/dtos/BulkVCardCsvDto';
import { BadRequestError } from '@/core/error/http';
import { TQrCodeWithRelations } from '../domain/entities/qr-code.entity';
import { TUser } from '@/core/domain/schema/UserSchema';
import { BulkContentTypeNotSupported } from '../error/http/bulk-content-type-not-supported.error';
import { BulkImportQrCodesPolicy } from '../policies/bulk-import-qr-codes.policy';

@injectable()
export class BulkImportQrCodesUseCase {
	private readonly columnMap: Partial<
		Record<
			TQrCodeContentType,
			{
				columns: string[];
				schema: ZodObject;
			}
		>
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
				'emailPrivate',
				'emailBusiness',
				'phonePrivate',
				'phoneMobile',
				'phoneBusiness',
				'fax',
				'company',
				'job',
				'street',
				'city',
				'zip',
				'state',
				'country',
				'website',
				'isDynamic',
			],
			schema: BulkVCardCsvDto,
		},
	};

	constructor(
		@inject(CreateQrCodeUseCase) private readonly createQrCodeUseCase: CreateQrCodeUseCase,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(dto: TBulkImportQrCodeDto, user: TUser): Promise<TQrCodeWithRelations[]> {
		const createdQrCodes: TQrCodeWithRelations[] = [];
		const { contentType, file, config } = dto;

		if (!this.isBulkSupported(contentType)) {
			throw new BulkContentTypeNotSupported(contentType);
		}

		const csvString = await this.readFile(file);
		const rawRecords = this.parseCsv(csvString, contentType);

		// check plan limits before validating rows
		const policy = new BulkImportQrCodesPolicy(user, rawRecords.length, file.size);
		policy.checkAccess();

		// validate each row
		const { validRecords, validationErrors } = this.validateRecords(rawRecords, contentType);

		if (validationErrors.length) {
			throw new BadRequestError(
				`Error parsing CSV File in line: ${validationErrors[0].line}`,
				validationErrors[0].error,
			);
		}

		this.logger.info('bulk.import.records', {
			bulkImport: {
				contentType,
				items: validRecords.length,
				user: user.id,
			},
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
					user,
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

	private parseCsv(csvString: string, contentType: TQrCodeContentType): any[] {
		try {
			return parse(csvString, {
				from_line: 2,
				skip_empty_lines: true,
				delimiter: ';',
				columns: this.columnMap[contentType]!.columns,
			});
		} catch (error) {
			const e = error as any;
			throw new BadRequestError(e.message);
		}
	}

	private validateRecords(
		rawRecords: any[],
		contentType: TQrCodeContentType,
	): {
		validRecords: any[];
		validationErrors: { line: number; error: $ZodError }[];
	} {
		const validRecords: any[] = [];
		const errors: { line: number; error: $ZodError }[] = [];

		rawRecords.forEach((record, index) => {
			try {
				const parsed = this.columnMap[contentType]!.schema.parse(record);
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
	}

	private isBulkSupported(type: TQrCodeContentType): type is keyof typeof this.columnMap {
		return type in this.columnMap;
	}
}
