import { ConfigTemplate } from "~/server/domain/entities/ConfigTemplate";
import { ICreateConfigTemplateUseCase } from "../ICreateConfigTemplateUseCase";
import { type TCreateConfigTemplateDto } from "~/server/domain/dtos/configTemplate/TCreateConfigTemplateDto";
import { type IBaseLogger } from "~/server/application/logger/IBaseLogger";
import { IEventEmitter } from "~/server/domain/events/IEventEmitter";
import { IConfigTemplateRepository } from "~/server/application/repositories/IConfigTemplateRepository";

/**
 * Use case for creating a ConfigTemplate entity.
 */
export class CreateConfigTemplateUseCase
  implements ICreateConfigTemplateUseCase
{
  constructor(
    private configTemplateRepository: IConfigTemplateRepository,
    private logger: IBaseLogger,
    private eventEmitter: IEventEmitter,
  ) {}

  /**
   * Executes the use case to create a new ConfigTemplate entity based on the given DTO.
   * @param dto The data transfer object containing the details for the ConfigTemplate to be created.
   * @param createdBy The ID of the user who created the ConfigTemplate.
   * @returns A promise that resolves with the newly created ConfigTemplate entity.
   */
  async execute(
    dto: TCreateConfigTemplateDto,
    createdBy: string,
  ): Promise<ConfigTemplate> {
    const newId = await this.configTemplateRepository.generateId();

    const configTemplate = ConfigTemplate.create({
      id: newId,
      config: dto.config,
      name: dto.name,
      createdBy,
    });

    // Create the ConfigTemplate entity in the database.
    await this.configTemplateRepository.create(configTemplate);

    // Retrieve the created ConfigTemplate entity from the database.
    const createdConfigTemplate =
      await this.configTemplateRepository.findOneById(newId);
    if (!createdConfigTemplate)
      throw new Error("Failed to create config template");

    // // Emit the ConfigTemplateCreatedEvent.
    // const event = new ConfigTemplateCreatedEvent(createdConfigTemplate);
    // this.eventEmitter.emit(event);

    this.logger.info("Config template created successfully", {
      id: createdConfigTemplate.id,
      createdBy: createdConfigTemplate.createdBy,
      name: createdConfigTemplate.name,
    });

    return createdConfigTemplate;
  }
}
