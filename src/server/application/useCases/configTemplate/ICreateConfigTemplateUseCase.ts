import { ConfigTemplate } from "~/server/domain/entities/ConfigTemplate";
import { type IBaseUseCase } from "../IBaseUseCase";
import { TCreateConfigTemplateDto } from "~/server/domain/dtos/configTemplate/TCreateConfigTemplateDto";

/**
 * Interface for the Create Config Template Use Case.
 */
export interface ICreateConfigTemplateUseCase extends IBaseUseCase {
  /**
   * Executes the Create Config Template Use Case.
   * @param dto The dto of the QRcode Template.
   * @param createdBy The ID of the user who created the config template.
   * @returns The created Config Template.
   */
  execute(dto: TCreateConfigTemplateDto, createdBy: string): Promise<ConfigTemplate>;
}
