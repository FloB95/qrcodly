import { z } from "zod";
import { BaseEntity, BaseEntitySchema } from "./BaseEntity";

/**
 * Type definition for specifying numbers within a certain range.
 * @example
 * TypeNumber.parse(5); // Valid
 * TypeNumber.parse(42); // Throws error
 */
const TypeNumber = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
  z.literal(11),
  z.literal(12),
  z.literal(13),
  z.literal(14),
  z.literal(15),
  z.literal(16),
  z.literal(17),
  z.literal(18),
  z.literal(19),
  z.literal(20),
  z.literal(21),
  z.literal(22),
  z.literal(23),
  z.literal(24),
  z.literal(25),
  z.literal(26),
  z.literal(27),
  z.literal(28),
  z.literal(29),
  z.literal(30),
  z.literal(31),
  z.literal(32),
  z.literal(33),
  z.literal(34),
  z.literal(35),
  z.literal(36),
  z.literal(37),
  z.literal(38),
  z.literal(39),
  z.literal(40),
]);

/**
 * Type definition for specifying the error correction level.
 */
export const ErrorCorrectionLevel = z.enum(["L", "M", "Q", "H"]);

/**
 * Type definition for specifying the mode of encoding.
 */
export const Mode = z.enum(["Numeric", "Alphanumeric", "Byte", "Kanji"]);

/**
 * Type definition for specifying the type of dots.
 */
export const DotType = z.enum([
  "dots",
  "rounded",
  "classy",
  "classy-rounded",
  "square",
  "extra-rounded",
]);

/**
 * Type definition for specifying the type of corner dots.
 */
export const CornerDotType = z.enum(["dot", "square"]);

/**
 * Type definition for specifying the type of corner squares.
 */
export const CornerSquareType = z.enum(["dot", "square", "extra-rounded"]);

/**
 * Type definition for specifying file extensions.
 */
export const FileExtension = z.enum(["svg", "png", "jpeg", "webp"]);
export type TFileExtension = z.infer<typeof FileExtension>;

/**
 * Type definition for specifying the type of gradient.
 */
export const GradientType = z.enum(["radial", "linear"]);

/**
 * Type definition for specifying the type of drawing.
 */
export const DrawType = z.enum(["canvas", "svg"]);

/**
 * Type definition for specifying the shape.
 */
export const ShapeType = z.enum(["square", "circle"]);

/**
 * Type definition for specifying a gradient.
 */
export const Gradient = z.object({
  type: GradientType.default("linear"),
  rotation: z.number().default(0),
  colorStops: z
    .array(
      z.object({
        offset: z.number(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i),
      }),
    )
    .min(2)
    .max(2),
});

/**
 * Type definition for specifying QR code generation options.
 */
export const Options = z.object({
  type: DrawType.default("canvas"),
  shape: ShapeType.default("square"),
  width: z.number().default(1000),
  height: z.number().default(1000),
  margin: z.number().default(0),
  data: z.string(),
  image: z.string().optional(),
  qrOptions: z.object({
    typeNumber: TypeNumber.default(0),
    mode: Mode.default("Byte"),
    errorCorrectionLevel: ErrorCorrectionLevel.default("Q"),
  }),
  imageOptions: z.object({
    hideBackgroundDots: z.boolean().default(true),
    imageSize: z.number().min(0.1).max(1.0).default(0.4),
    crossOrigin: z.string().default("anonymous"),
    margin: z.number().min(0).max(100).default(20),
  }),
  dotsOptions: z.object({
    type: DotType.default("rounded"),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i)
      .default("#000000"),
    gradient: Gradient.optional(),
  }),
  cornersSquareOptions: z.object({
    type: CornerSquareType.default("extra-rounded"),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i)
      .default("#000000"),
    gradient: Gradient.optional(),
  }),
  cornersDotOptions: z.object({
    type: CornerDotType.default("dot"),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i)
      .default("#000000"),
    gradient: Gradient.optional(),
  }),
  backgroundOptions: z.object({
    round: z.number().default(0),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i)
      .default("#FFFFFF"),
    gradient: Gradient.optional(),
  }),
});

/**
 * Alias for the inferred type of QR code generation options.
 */
export type TQRcodeOptions = z.infer<typeof Options>;

/**
 * Schema definition for QR code entity.
 */
export const QRcodeSchema = BaseEntitySchema.extend({
  config: Options,
});

/**
 * Represents a QR code entity.
 */
export class QRcode extends BaseEntity {
  /**
   * Constructs a QR code entity.
   * @param {string} id - The ID of the QR code.
   * @param {TQRcodeOptions} config - The configuration options for generating the QR code.
   */
  constructor(
    public readonly id: string,
    public config: TQRcodeOptions,
  ) {
    super(id);
  }
}
