import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import UserSurveyRepository from '../domain/repository/user-survey.repository';
import { Logger } from '@/core/logging';
import { type TSubmitUserSurveyDto } from '@shared/schemas';

@injectable()
export class SubmitSurveyUseCase implements IBaseUseCase {
	constructor(
		@inject(UserSurveyRepository) private userSurveyRepository: UserSurveyRepository,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(dto: TSubmitUserSurveyDto, userId: string): Promise<void> {
		const newId = this.userSurveyRepository.generateId();

		try {
			await this.userSurveyRepository.create({
				id: newId,
				userId,
				rating: dto.rating,
				feedback: dto.feedback ?? null,
			});
		} catch (error) {
			const existing = await this.userSurveyRepository.findByUserId(userId);
			if (existing) return;
			throw error;
		}

		this.logger.info('user-survey.submitted', {
			survey: { userId, rating: dto.rating },
		});
	}
}
