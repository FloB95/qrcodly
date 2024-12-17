import { TConfigTemplateResponseDto } from "../dtos/configTemplate/TConfigTemplateResponseDto";
import { TQRcodeOptions } from "../types/QRcode";
import { BaseEntity } from "./BaseEntity";

/**
 * Represents a ConfigTemplate entity.
 * @extends BaseEntity
 */
export class ConfigTemplate extends BaseEntity {
  private readonly _config: TQRcodeOptions;
  private readonly _createdBy: string;
  private readonly _name?: string;

  private constructor(
    id: string,
    config: TQRcodeOptions,
    createdBy: string,
    name?: string,
    createdAt?: Date,
    updatedAt?: Date | null,
  ) {
    super(id);
    if (!config) {
      throw new Error("Config cannot be null or undefined");
    }
    if (!createdBy) {
      throw new Error("CreatedBy cannot be null or undefined");
    }
    this._config = config;
    this._createdBy = createdBy;
    this._name = name;
    this.createdAt = createdAt ?? new Date();
    this.updatedAt = updatedAt ?? null;
  }

  /**
   * Gets the configuration options.
   * @returns {TQRcodeOptions} The configuration options.
   */
  get config(): TQRcodeOptions {
    return this._config;
  }

  /**
   * Gets the user ID who created the configuration template.
   * @returns {string} The user ID.
   */
  get createdBy(): string {
    return this._createdBy;
  }

  /**
   * Gets the name of the configuration template.
   * @returns {string | undefined} The name of the configuration template.
   */
  get name(): string | undefined {
    return this._name;
  }

  /**
   * Creates a ConfigTemplate instance from a DTO.
   *
   * @param {TConfigTemplateResponseDto} json - The DTO containing the configuration template data.
   * @returns {ConfigTemplate} The created ConfigTemplate instance.
   */
  static fromDTO(json: TConfigTemplateResponseDto): ConfigTemplate {
    return new ConfigTemplate(
      json.id,
      json.config,
      json.createdBy,
      json.name,
      json.createdAt,
      json.updatedAt,
    );
  }

  /**
   * Creates a new ConfigTemplate instance.
   *
   * @param {Object} params - The parameters for creating the configuration template.
   * @param {string} params.id - The ID of the configuration template.
   * @param {TQRcodeOptions} params.config - The configuration options for generating the QR code.
   * @param {string} params.createdBy - The user ID who created the configuration template.
   * @param {string} [params.name] - The name of the configuration template.
   * @param {Date} [params.createdAt] - The date and time when the configuration template was created.
   * @param {Date | null} [params.updatedAt] - The date and time when the configuration template was last updated.
   * @returns {ConfigTemplate} The created ConfigTemplate instance.
   */
  static create(params: {
    id: string;
    config: TQRcodeOptions;
    createdBy: string;
    name?: string;
    createdAt?: Date;
    updatedAt?: Date | null;
  }): ConfigTemplate {
    return new ConfigTemplate(
      params.id,
      params.config,
      params.createdBy,
      params.name,
      params.createdAt,
      params.updatedAt,
    );
  }
}
