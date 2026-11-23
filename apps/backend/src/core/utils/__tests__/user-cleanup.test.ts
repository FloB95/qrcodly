import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { container } from 'tsyringe';
import { type Logger } from '@/core/logging';
import { type EventEmitter } from '@/core/event/event.emitter';
import { UserCleanupFailedEvent } from '@/core/event/user-cleanup-failed.event';
import { cleanUpAfterUser, deleteAllOfUser } from '../user-cleanup';

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

// the retries wait between attempts; not in tests
jest.mock('@/utils/general', () => ({
	...jest.requireActual('@/utils/general'),
	sleep: jest.fn().mockResolvedValue(undefined),
}));

type Item = { id: string };

describe('user cleanup', () => {
	let logger: MockProxy<Logger>;
	let emitter: MockProxy<EventEmitter>;

	beforeEach(() => {
		logger = mock<Logger>();
		emitter = mock<EventEmitter>();
		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			return name === 'EventEmitter' ? emitter : logger;
		});
	});

	const reported = () =>
		emitter.emit.mock.calls.map(([event]) => (event as UserCleanupFailedEvent).data);

	describe('deleteAllOfUser', () => {
		/** A store that loses each item its delete succeeds for, like a repository would */
		const store = (count: number, failing: string[] = []) => {
			let items: Item[] = Array.from({ length: count }, (_, i) => ({ id: `item-${i}` }));
			return {
				findBatch: jest.fn(async (limit: number) => items.slice(0, limit)),
				deleteOne: jest.fn(async (item: Item) => {
					if (failing.includes(item.id)) throw new Error(`cannot delete ${item.id}`);
					items = items.filter((other) => other.id !== item.id);
				}),
				left: () => items,
			};
		};

		it('deletes across several batches until nothing is left', async () => {
			const items = store(250);

			await deleteAllOfUser('thing', 'user-1', items.findBatch, items.deleteOne);

			expect(items.left()).toEqual([]);
			expect(items.findBatch).toHaveBeenCalledTimes(4);
			expect(logger.info).toHaveBeenCalledWith('thing.user-cleanup', {
				userId: 'user-1',
				deleted: 250,
				failed: 0,
			});
			expect(emitter.emit).not.toHaveBeenCalled();
		});

		it('tries an item again when its delete fails only for a moment', async () => {
			const items = store(3);
			const deleteOnce = items.deleteOne.getMockImplementation()!;
			items.deleteOne.mockRejectedValueOnce(new Error('deadlock')).mockImplementation(deleteOnce);

			await deleteAllOfUser('thing', 'user-1', items.findBatch, items.deleteOne);

			expect(items.left()).toEqual([]);
			expect(items.deleteOne).toHaveBeenCalledTimes(4);
			expect(emitter.emit).not.toHaveBeenCalled();
		});

		it('skips an item that keeps failing, deletes the rest and reports the failures once', async () => {
			const items = store(150, ['item-0', 'item-120']);

			await deleteAllOfUser('thing', 'user-1', items.findBatch, items.deleteOne);

			expect(items.left().map((item) => item.id)).toEqual(['item-0', 'item-120']);
			// three attempts for each failing item, and it is not picked up again in a later batch
			expect(items.deleteOne).toHaveBeenCalledTimes(148 + 2 * 3);
			expect(logger.info).toHaveBeenCalledWith('thing.user-cleanup', {
				userId: 'user-1',
				deleted: 148,
				failed: 2,
			});
			expect(reported()).toEqual([
				{ userId: 'user-1', step: 'thing', failedItems: 2, error: 'cannot delete item-120' },
			]);
		});

		it('reports instead of throwing when the items cannot be read', async () => {
			const findBatch = jest.fn().mockRejectedValue(new Error('db down'));

			await expect(
				deleteAllOfUser('thing', 'user-1', findBatch, jest.fn()),
			).resolves.toBeUndefined();

			expect(findBatch).toHaveBeenCalledTimes(3);
			expect(reported()).toEqual([
				{ userId: 'user-1', step: 'thing', failedItems: undefined, error: 'db down' },
			]);
		});
	});

	describe('cleanUpAfterUser', () => {
		it('tries the step again after a short outage', async () => {
			const run = jest
				.fn()
				.mockRejectedValueOnce(new Error('Stripe 503'))
				.mockResolvedValue(undefined);

			await cleanUpAfterUser('billing', 'user-1', run);

			expect(run).toHaveBeenCalledTimes(2);
			expect(emitter.emit).not.toHaveBeenCalled();
		});

		it('logs and reports a step that keeps failing instead of throwing', async () => {
			const run = jest.fn().mockRejectedValue(new Error('Stripe down'));

			await expect(cleanUpAfterUser('billing', 'user-1', run)).resolves.toBeUndefined();

			expect(run).toHaveBeenCalledTimes(3);
			expect(logger.error).toHaveBeenCalledWith('billing.user-cleanup.failed', {
				userId: 'user-1',
				failedItems: undefined,
				error: expect.any(Error),
			});
			expect(reported()).toEqual([
				{ userId: 'user-1', step: 'billing', failedItems: undefined, error: 'Stripe down' },
			]);
			expect(emitter.emit.mock.calls[0][0]).toBeInstanceOf(UserCleanupFailedEvent);
		});
	});
});
