import { z } from "zod";

/**
 * The base entity schema.
 */
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date().nullable().default(null),
});

/**
 * The base entity class.
 */
export abstract class BaseEntity {
  /**
   * The unique identifier of the entity.
   */
  public readonly id: string;

  /**
   * The date and time when the entity was created.
   */
  public createdAt: Date = new Date();

  /**
   * The date and time when the entity was last updated.
   */
  public updatedAt: Date | null = null;

  /**
   * Creates an instance of BaseEntity.
   * @param {string} id The unique identifier of the entity.
   */
  constructor(id: string) {
    this.id = id;
  }

  /**
   * Sets the date and time when the entity was created.
   * @param {Date} date The date and time when the entity was created.
   */
  setCreatedAt(date: Date) {
    this.createdAt = date;
  }

  /**
   * Sets the date and time when the entity was last updated.
   * @param {Date | null} date The date and time when the entity was last updated.
   */
  setUpdatedAt(date: Date | null) {
    this.updatedAt = date;
  }
}
