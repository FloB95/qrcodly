import 'reflect-metadata';
import { DeleteTagUseCase } from '../delete-tag.use-case';
import type TagRepository from '../../domain/repository/tag.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TTag } from '../../domain/entities/tag.entity';

describe('DeleteTagUseCase', () => {
	let useCase: DeleteTagUseCase;
	let mockRepository: MockProxy<TagRepository>;
	let mockLogger: MockProxy<Logger>;

	const existingTag: TTag = {
		id: 'tag-1',
		name: 'Important',
		color: '#FF5733',
		createdBy: 'user-123',
		createdAt: new Date(),
		updatedAt: null,
	};

	beforeEach(() => {
		mockRepository = mock<TagRepository>();
		mockLogger = mock<Logger>();

		useCase = new DeleteTagUseCase(mockRepository, mockLogger);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should delete tag successfully', async () => {
		mockRepository.delete.mockResolvedValue(true);

		const result = await useCase.execute(existingTag, 'user-123');

		expect(mockRepository.delete).toHaveBeenCalledWith(existingTag);
		expect(result).toBe(true);
	});

	it('should log successful deletion', async () => {
		mockRepository.delete.mockResolvedValue(true);

		await useCase.execute(existingTag, 'user-123');

		expect(mockLogger.info).toHaveBeenCalledWith('tag.deleted', {
			tag: { id: 'tag-1', deletedBy: 'user-123' },
		});
	});

	it('should log error on failed deletion', async () => {
		mockRepository.delete.mockResolvedValue(false);

		const result = await useCase.execute(existingTag, 'user-123');

		expect(result).toBe(false);
		expect(mockLogger.error).toHaveBeenCalledWith('error.tag.deleted', {
			tag: { id: 'tag-1', deletedBy: 'user-123' },
		});
	});
});
