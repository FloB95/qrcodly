import 'reflect-metadata';
import { ListTagsUseCase } from '../list-tags.use-case';
import type TagRepository from '../../domain/repository/tag.repository';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TTag } from '../../domain/entities/tag.entity';

describe('ListTagsUseCase', () => {
	let useCase: ListTagsUseCase;
	let mockRepository: MockProxy<TagRepository>;

	const mockTags: TTag[] = [
		{
			id: 'tag-1',
			name: 'Important',
			color: '#FF5733',
			createdBy: 'user-123',
			createdAt: new Date(),
			updatedAt: null,
		},
		{
			id: 'tag-2',
			name: 'Archive',
			color: '#33FF57',
			createdBy: 'user-123',
			createdAt: new Date(),
			updatedAt: null,
		},
	];

	beforeEach(() => {
		mockRepository = mock<TagRepository>();
		useCase = new ListTagsUseCase(mockRepository);

		mockRepository.findAll.mockImplementation(async () => JSON.parse(JSON.stringify(mockTags)));
		mockRepository.countTotal.mockResolvedValue(2);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should query repository with correct parameters', async () => {
		await useCase.execute({
			limit: 10,
			page: 1,
			where: { createdBy: { eq: 'user-123' } },
		});

		expect(mockRepository.findAll).toHaveBeenCalledWith({
			limit: 10,
			page: 1,
			where: { createdBy: { eq: 'user-123' } },
		});
	});

	it('should return tags and total count', async () => {
		const result = await useCase.execute({ limit: 10, page: 1 });

		expect(result).toHaveProperty('tags');
		expect(result).toHaveProperty('total');
		expect(result.tags).toHaveLength(2);
		expect(result.total).toBe(2);
	});

	it('should handle empty results', async () => {
		mockRepository.findAll.mockResolvedValue([]);
		mockRepository.countTotal.mockResolvedValue(0);

		const result = await useCase.execute({ limit: 10, page: 1 });

		expect(result.tags).toHaveLength(0);
		expect(result.total).toBe(0);
	});

	it('should handle different pagination parameters', async () => {
		await useCase.execute({ limit: 20, page: 2 });

		expect(mockRepository.findAll).toHaveBeenCalledWith({
			limit: 20,
			page: 2,
		});
	});

	it('should count total with where conditions', async () => {
		const where = { createdBy: { eq: 'user-123' } };
		await useCase.execute({ limit: 10, page: 1, where });

		expect(mockRepository.countTotal).toHaveBeenCalledWith(where);
	});
});
