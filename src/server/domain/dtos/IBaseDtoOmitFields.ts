/**
 * Interface for the Base DTO Omit Fields.
 */
interface IBaseDtoOmitFields {
  id?: true;
  createdAt?: true;
  updatedAt?: true;
}

/**
 * Base DTO Omit Fields.
 */
export const BaseDtoOmitFields: IBaseDtoOmitFields = {
  id: true,
  createdAt: true,
  updatedAt: true,
};
