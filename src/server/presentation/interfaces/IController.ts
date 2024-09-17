/**
 * Interface for controllers that handle HTTP requests.
 */
export interface IController {
  /**
   * Handles an HTTP request and returns an HTTP response.
   * @param dto The data transfer object (DTO) containing the request data.
   * @returns A promise that resolves to an HTTP response object.
   */
  handle(dto?: any): Promise<any>;
}
