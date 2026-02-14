import 'reflect-metadata';
import { CreateTagUseCase } from '../create-tag.use-case';
import type TagRepository from '../../domain/repository/tag.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TTag } from '../../domain/entities/tag.entity';

describe('CreateTagUseCase', () => {
	let useCase: CreateTagUseCase;
	let mockRepository: MockProxy<TagRepository>;
	let mockLogger: MockProxy<Logger>;

	const mockTag: TTag = {
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

		useCase = new CreateTagUseCase(mockRepository, mockLogger);

		mockRepository.generateId.mockResolvedValue('tag-1');
		mockRepository.create.mockResolvedValue(undefined);
		mockRepository.findOneById.mockResolvedValue(JSON.parse(JSON.stringify(mockTag)));
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should create a tag successfully', async () => {
		const result = await useCase.execute({ name: 'Important', color: '#FF5733' }, 'user-123');

		expect(mockRepository.generateId).toHaveBeenCalled();
		expect(mockRepository.create).toHaveBeenCalledWith({
			id: 'tag-1',
			name: 'Important',
			color: '#FF5733',
			createdBy: 'user-123',
		});
		expect(mockRepository.findOneById).toHaveBeenCalledWith('tag-1');
		expect(result.id).toBe('tag-1');
		expect(result.name).toBe('Important');
		expect(result.color).toBe('#FF5733');
	});

	it('should log tag creation', async () => {
		await useCase.execute({ name: 'Important', color: '#FF5733' }, 'user-123');

		expect(mockLogger.info).toHaveBeenCalledWith('tag.created', {
			tag: { id: 'tag-1', createdBy: 'user-123' },
		});
	});

	it('should throw if tag retrieval fails', async () => {
		mockRepository.findOneById.mockResolvedValue(undefined);

		await expect(
			useCase.execute({ name: 'Important', color: '#FF5733' }, 'user-123'),
		).rejects.toThrow('Failed to retrieve Tag');
	});
});
