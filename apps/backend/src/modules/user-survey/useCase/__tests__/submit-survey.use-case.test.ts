import 'reflect-metadata';
import { SubmitSurveyUseCase } from '../submit-survey.use-case';
import type UserSurveyRepository from '../../domain/repository/user-survey.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TUserSurvey } from '../../domain/entities/user-survey.entity';

describe('SubmitSurveyUseCase', () => {
	let useCase: SubmitSurveyUseCase;
	let mockRepository: MockProxy<UserSurveyRepository>;
	let mockLogger: MockProxy<Logger>;

	const userId = 'user-123';
	const surveyId = 'survey-1';

	const mockDto = {
		rating: 'up' as const,
		feedback: 'Great app!',
	};

	const mockSurvey: TUserSurvey = {
		id: surveyId,
		userId,
		rating: mockDto.rating,
		feedback: mockDto.feedback,
		createdAt: new Date(),
	};

	beforeEach(() => {
		mockRepository = mock<UserSurveyRepository>();
		mockLogger = mock<Logger>();
		useCase = new SubmitSurveyUseCase(mockRepository, mockLogger);

		mockRepository.generateId.mockReturnValue(surveyId);
		mockRepository.create.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should create a survey entry', async () => {
		await useCase.execute(mockDto, userId);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				id: surveyId,
				userId,
				rating: mockDto.rating,
				feedback: mockDto.feedback,
			}),
		);
	});

	it('should handle null feedback', async () => {
		const dtoNoFeedback = { rating: 'up' as const, feedback: undefined };

		await useCase.execute(dtoNoFeedback, userId);

		expect(mockRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: null }),
		);
	});

	it('should log successful submission', async () => {
		await useCase.execute(mockDto, userId);

		expect(mockLogger.info).toHaveBeenCalledWith('user-survey.submitted', {
			survey: { userId, rating: mockDto.rating },
		});
	});

	it('should silently succeed when survey already exists for user', async () => {
		mockRepository.create.mockRejectedValue(new Error('Duplicate entry'));
		mockRepository.findByUserId.mockResolvedValue(mockSurvey);

		await expect(useCase.execute(mockDto, userId)).resolves.toBeUndefined();
	});

	it('should rethrow error when create fails and no existing survey found', async () => {
		mockRepository.create.mockRejectedValue(new Error('Database error'));
		mockRepository.findByUserId.mockResolvedValue(undefined);

		await expect(useCase.execute(mockDto, userId)).rejects.toThrow('Database error');
	});

	it('should not log when survey already exists', async () => {
		mockRepository.create.mockRejectedValue(new Error('Duplicate entry'));
		mockRepository.findByUserId.mockResolvedValue(mockSurvey);

		await useCase.execute(mockDto, userId);

		expect(mockLogger.info).not.toHaveBeenCalled();
	});
});
