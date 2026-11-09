import { container } from 'tsyringe';
import { randomUUID } from 'node:crypto';
import { resetTestState, TEST_USER_ID } from '@/tests/shared/test-context';
import { getTestContext } from '@/modules/qr-code/http/__tests__/utils';
import { ObjectStorage, type PrivateBucket } from '@/core/storage';
import { HostedFileService } from '@/modules/hosted-page/service/hosted-file.service';
import StoredFileRepository from '../../domain/repository/stored-file.repository';
import { CleanupStoredFilesCronJob } from '../cleanup-stored-files.cron-job';
import { STORED_FILE_ORPHAN_MAX_AGE_HOURS } from '../../config/constants';

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000);
const stale = () => hoursAgo(STORED_FILE_ORPHAN_MAX_AGE_HOURS + 1);

describe('CleanupStoredFilesCronJob', () => {
	let repository: StoredFileRepository;
	let fileService: HostedFileService;
	// documents live in the private bucket: the sweep must delete them there
	let privateStorage: PrivateBucket;

	const insertFile = async (
		createdAt: Date,
		state: {
			owner?: string;
			released?: { purgeAfter: Date | null };
		} = {},
	) => {
		const fileKey = fileService.buildKey(TEST_USER_ID, 'pdf');
		await fileService.upload(
			{ fileKey, visibility: 'private' },
			Buffer.from('%PDF-1.4 test'),
			'application/pdf',
		);
		await repository.create({
			id: randomUUID(),
			userId: TEST_USER_ID,
			ownerType: state.owner ? 'hosted_page' : null,
			ownerId: state.owner ?? null,
			kind: 'pdf',
			visibility: 'private',
			slot: state.owner ? 'document' : null,
			itemId: null,
			fileKey,
			fileName: 'test.pdf',
			fileSize: 13,
			contentType: 'application/pdf',
			claimedAt: state.owner ? createdAt : null,
			releasedAt: state.released ? createdAt : null,
			purgeAfter: state.released?.purgeAfter ?? null,
			createdAt,
		});
		return fileKey;
	};

	const sweep = () => container.resolve(CleanupStoredFilesCronJob).sweep();

	beforeAll(async () => {
		await resetTestState();
		await getTestContext();
		repository = container.resolve(StoredFileRepository);
		fileService = container.resolve(HostedFileService);
		privateStorage = container.resolve(ObjectStorage).private;
	});

	it('removes stale unclaimed uploads and keeps fresh ones', async () => {
		const staleUnclaimed = await insertFile(stale());
		const freshUnclaimed = await insertFile(hoursAgo(1));

		const result = await sweep();

		expect(result.errors).toBe(0);
		expect(await repository.findByFileKey(staleUnclaimed)).toBeUndefined();
		await expect(privateStorage.get(staleUnclaimed)).rejects.toThrow();
		expect(await repository.findByFileKey(freshUnclaimed)).toBeDefined();
		expect(await privateStorage.get(freshUnclaimed)).not.toBeNull();
	});

	it('keeps released files until their purge date and never deletes files kept for good', async () => {
		const old = hoursAgo(STORED_FILE_ORPHAN_MAX_AGE_HOURS * 40);
		const owner = randomUUID();
		const due = await insertFile(old, { owner, released: { purgeAfter: hoursAgo(1) } });
		const inGrace = await insertFile(old, {
			owner,
			released: { purgeAfter: new Date(Date.now() + 60_000) },
		});
		const keptForGood = await insertFile(old, { owner, released: { purgeAfter: null } });

		await sweep();

		expect(await repository.findByFileKey(due)).toBeUndefined();
		await expect(privateStorage.get(due)).rejects.toThrow();
		// the owner does not exist: released files still wait for their purge date
		expect(await repository.findByFileKey(inGrace)).toBeDefined();
		expect(await privateStorage.get(inGrace)).not.toBeNull();
		expect(await repository.findByFileKey(keptForGood)).toBeDefined();
	});

	it('removes files still in use by an owner that no longer exists', async () => {
		const orphaned = await insertFile(stale(), { owner: randomUUID() });

		await sweep();

		expect(await repository.findByFileKey(orphaned)).toBeUndefined();
	});

	it('leaves a file that was claimed after the batch was read', async () => {
		const fileKey = await insertFile(stale());
		const snapshot = (await repository.findUnclaimedBefore(new Date(), 1000)).filter(
			(file) => file.fileKey === fileKey,
		);
		expect(snapshot).toHaveLength(1);
		// a save claims the file between the sweep's read and its delete
		await repository.claim(
			fileKey,
			{ type: 'hosted_page', id: randomUUID() },
			{ slot: 'document' },
		);
		const staleRead = jest.spyOn(repository, 'findUnclaimedBefore').mockResolvedValueOnce(snapshot);
		try {
			await sweep();
		} finally {
			staleRead.mockRestore();
		}

		expect(await repository.findByFileKey(fileKey)).toBeDefined();
		expect(await privateStorage.get(fileKey)).not.toBeNull();
		await repository.deleteByFileKey(fileKey);
	});

	it('leaves a released file that was taken back into use after the batch was read', async () => {
		const owner = { type: 'hosted_page' as const, id: randomUUID() };
		const fileKey = await insertFile(hoursAgo(1), {
			owner: owner.id,
			released: { purgeAfter: hoursAgo(1) },
		});
		const snapshot = (await repository.findPurgeDue(new Date(), 1000)).filter(
			(file) => file.fileKey === fileKey,
		);
		expect(snapshot).toHaveLength(1);
		// its page takes the document back between the sweep's read and its delete
		await repository.claim(fileKey, owner, { slot: 'document' });
		const staleRead = jest.spyOn(repository, 'findPurgeDue').mockResolvedValueOnce(snapshot);
		try {
			await sweep();
		} finally {
			staleRead.mockRestore();
		}

		expect(await repository.findByFileKey(fileKey)).toBeDefined();
		expect(await privateStorage.get(fileKey)).not.toBeNull();
		await repository.deleteByFileKey(fileKey);
	});

	it('refuses to claim a file another owner holds', async () => {
		const fileKey = await insertFile(hoursAgo(1), { owner: randomUUID() });
		const other = { type: 'hosted_page' as const, id: randomUUID() };

		expect(await repository.claim(fileKey, other, { slot: 'document' })).toBe(false);
		await repository.deleteByFileKey(fileKey);
	});
});
