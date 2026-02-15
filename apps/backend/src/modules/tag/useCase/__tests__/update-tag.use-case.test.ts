import 'reflect-metadata';
import { UpdateTagUseCase } from '../update-tag.use-case';
import type TagRepository from '../../domain/repository/tag.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TTag } from '../../domain/entities/tag.entity';

describe('UpdateTagUseCase', () => {
	let useCase: UpdateTagUseCase;
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

		useCase = new UpdateTagUseCase(mockRepository, mockLogger);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should update tag name', async () => {
		const updatedTag = { ...existingTag, name: 'Urgent', updatedAt: new Date() };
		mockRepository.findOneById.mockResolvedValue(updatedTag);

		const result = await useCase.execute(existingTag, { name: 'Urgent' }, 'user-123');

		expect(mockRepository.update).toHaveBeenCalledWith(
			existingTag,
			expect.objectContaining({ name: 'Urgent' }),
		);
		expect(result.name).toBe('Urgent');
	});

	it('should update tag color', async () => {
		const updatedTag = { ...existingTag, color: '#00FF00', updatedAt: new Date() };
		mockRepository.findOneById.mockResolvedValue(updatedTag);

		const result = await useCase.execute(existingTag, { color: '#00FF00' }, 'user-123');

		expect(mockRepository.update).toHaveBeenCalledWith(
			existingTag,
			expect.objectContaining({ color: '#00FF00' }),
		);
		expect(result.color).toBe('#00FF00');
	});

	it('should log tag update', async () => {
		mockRepository.findOneById.mockResolvedValue({ ...existingTag, updatedAt: new Date() });

		await useCase.execute(existingTag, { name: 'Updated' }, 'user-123');

		expect(mockLogger.info).toHaveBeenCalledWith('tag.updated', {
			tag: { id: 'tag-1', updatedBy: 'user-123' },
		});
	});
});
