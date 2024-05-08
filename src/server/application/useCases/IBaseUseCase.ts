/**
 * Interface for the Base Use Case.
 */
export interface IBaseUseCase {
  /**
   * Executes the Base Use Case.
   * @param args The arguments for the use case.
   * @returns The result of the use case execution.
   */
  execute(...args: any): any
}
