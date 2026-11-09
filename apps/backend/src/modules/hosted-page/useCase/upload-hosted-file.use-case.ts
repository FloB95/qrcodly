import { inject, injectable } from 'tsyringe';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { Logger } from '@/core/logging';
import { BadRequestError } from '@/core/error/http';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { type THostedUploadDto, type THostedUploadResponseDto } from '@shared/schemas';
import { randomUUID } from 'node:crypto';
import StoredFileRepository from '@/modules/stored-file/domain/repository/stored-file.repository';
import { STORED_FILE_ORPHAN_MAX_AGE_HOURS } from '@/modules/stored-file/config/constants';
import { HostedFileService } from '../service/hosted-file.service';
import { HostedUploadPolicy } from '../policies/hosted-upload.policy';
import { MalwareScanService } from '@/modules/stored-file/service/malware-scan.service';
import { hostedFilesUploaded, safely } from '@/core/metrics';
import { HOSTED_UPLOAD_MAX_UNCLAIMED } from '../config/constants';
import { HostedTooManyPendingUploadsError } from '../error/http/hosted-too-many-pending-uploads.error';

const FILE_NAME_MAX_LENGTH = 255;

@injectable()
export class UploadHostedFileUseCase implements IBaseUseCase {
	constructor(
		@inject(StoredFileRepository) private readonly fileRepository: StoredFileRepository,
		@inject(HostedFileService) private readonly fileService: HostedFileService,
		@inject(MalwareScanService) private readonly malwareScan: MalwareScanService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	async execute(dto: THostedUploadDto, user: TUser): Promise<THostedUploadResponseDto> {
		const buffer = Buffer.from(await dto.file.arrayBuffer());
		if (buffer.length === 0) {
			throw new BadRequestError('The uploaded file is empty');
		}

		new HostedUploadPolicy(user, dto.kind, buffer.length).checkAccess();
		const pending = await this.fileRepository.countUnclaimedSince(
			user.id,
			new Date(Date.now() - STORED_FILE_ORPHAN_MAX_AGE_HOURS * 60 * 60 * 1000),
		);
		if (pending >= HOSTED_UPLOAD_MAX_UNCLAIMED) {
			throw new HostedTooManyPendingUploadsError(HOSTED_UPLOAD_MAX_UNCLAIMED);
		}

		// the real type comes from the bytes (images are re-encoded); then every kind is virus-scanned
		const stored = await this.fileService.prepare(buffer, dto.kind);
		await this.malwareScan.assertClean(stored.buffer, {
			userId: user.id,
			kind: dto.kind,
			fileName: dto.file.name,
		});

		const fileKey = this.fileService.buildKey(user.id, stored.extension);
		const object = { fileKey, visibility: this.fileService.visibilityOf(dto.kind) };
		const fileName = this.sanitizeFileName(dto.file.name, stored.extension);

		// the row comes first: an object without one would be invisible to every cleanup
		await this.fileRepository.create({
			id: randomUUID(),
			userId: user.id,
			ownerType: null,
			ownerId: null,
			kind: dto.kind,
			visibility: object.visibility,
			slot: null,
			itemId: null,
			fileKey,
			fileName,
			fileSize: stored.buffer.length,
			contentType: stored.contentType,
			claimedAt: null,
			releasedAt: null,
			purgeAfter: null,
			createdAt: new Date(),
		});
		try {
			await this.fileService.upload(object, stored.buffer, stored.contentType);
		} catch (error) {
			// the object may exist after all (a lost response): the row only goes with a confirmed
			// delete, otherwise it stays for the sweep
			try {
				await this.fileService.deleteOrThrow(object);
				await this.fileRepository.deleteByFileKey(fileKey);
			} catch {
				// left to the sweep
			}
			throw error;
		}

		safely(() => hostedFilesUploaded.add(1, { kind: dto.kind }));
		this.logger.info('hostedPage.file.uploaded', {
			hostedUpload: {
				userId: user.id,
				kind: dto.kind,
				visibility: object.visibility,
				fileKey,
				fileSize: stored.buffer.length,
				contentType: stored.contentType,
			},
		});

		return {
			kind: dto.kind,
			fileKey,
			fileName,
			fileSize: stored.buffer.length,
			contentType: stored.contentType,
			// private files are only served through their page, which applies its checks
			url: this.fileService.getPublicUrl(object),
		};
	}

	/** The stored name always ends in the detected type, so a download can never be a `.bat`. */
	private sanitizeFileName(name: string | undefined, extension: string): string {
		const cleaned = (name ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim();
		const base = cleaned.replace(/\.[A-Za-z0-9]{1,8}$/, '').trim() || 'file';
		return `${base.slice(0, FILE_NAME_MAX_LENGTH - extension.length - 1)}.${extension}`;
	}
}
