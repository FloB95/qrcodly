/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { z } from "zod";
import { BaseEntitySchema } from "../entities/BaseEntity";

export const UrlInputSchema = z.string().url();
export type TUrlInput = z.infer<typeof UrlInputSchema>;

export const TextInputSchema = z.string().max(1000);
export type TTextInput = z.infer<typeof TextInputSchema>;

export const WifiInputSchema = z
  .object({
    ssid: z.string().max(32),
    password: z.string().max(64).optional(),
    encryption: z.enum(["WPA", "WEP", "nopass"]).default("WPA"),
  })
  .default({
    ssid: "",
    password: "",
    encryption: "WPA",
  });
export type TWifiInput = z.infer<typeof WifiInputSchema>;

export const VCardInputSchema = z.object({
  firstName: z.string().max(64).optional(),
  lastName: z.string().max(64).optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?\d{1,4}\d{6,15}$/)
    .optional(),
  fax: z
    .string()
    .regex(/^\+?\d{1,4}\d{6,15}$/)
    .optional(),
  company: z.string().max(64).optional(),
  job: z.string().max(64).optional(),
  street: z.string().max(64).optional(),
  city: z.string().max(64).optional(),
  zip: z.string().max(10).optional(),
  state: z.string().max(64).optional(),
  country: z.string().max(64).optional(),
  website: z.string().url().optional(),
});
export type TVCardInput = z.infer<typeof VCardInputSchema>;

const QrCodeContentOriginalDataSchema = z.union([
  UrlInputSchema,
  TextInputSchema,
  WifiInputSchema,
  VCardInputSchema,
]);

export type TQrCodeContentOriginalData = z.infer<
  typeof QrCodeContentOriginalDataSchema
>;

// Define the type mapping
export type TQrCodeContentOriginalDataMap = {
  url: z.infer<typeof UrlInputSchema>;
  text: z.infer<typeof TextInputSchema>;
  wifi: z.infer<typeof WifiInputSchema>;
  vCard: z.infer<typeof VCardInputSchema>;
};

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
export type TDotType = z.infer<typeof DotType>;

/**
 * Type definition for specifying the type of corner dots.
 */
export const CornerDotType = z.enum(["dot", "square"]);
export type TCornerDotType = z.infer<typeof CornerDotType>;

/**
 * Type definition for specifying the type of corner squares.
 */
export const CornerSquareType = z.enum(["dot", "square", "extra-rounded"]);
export type TCornerSquareType = z.infer<typeof CornerSquareType>;

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
 * Type definition for specifying the content type of the QR code.
 */
export const QrCodeContentType = z.union([
  z.literal("url"),
  z.literal("text"),
  z.literal("wifi"),
  z.literal("vCard"),
]);
export type TQrCodeContentType = z.infer<typeof QrCodeContentType>;

/**
 * Type definition for specifying QR code generation options.
 */
export const QrCodeOptionsSchema = z.object({
  type: DrawType.default("canvas"),
  contentType: z
    .object({
      type: QrCodeContentType,
      // Add a conditional field based on the value of `type`
      editable: z.boolean().optional(),
    })
    .superRefine((arg, ctx) => {
      if (arg.type === "url" && typeof arg.editable === "undefined") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, // customize your issue
          message: "editable is required for url content type",
        });
      }
      return z.NEVER; // The return value is not used, but we need to return something to satisfy the typing
    }),
  shape: ShapeType.default("square"),
  width: z.number().default(1000),
  height: z.number().default(1000),
  margin: z.number().default(0),
  data: z.string(),
  originalData: QrCodeContentOriginalDataSchema,
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
export type TQRcodeOptions = z.infer<typeof QrCodeOptionsSchema>;

/**
 * Schema definition for QR code entity.
 */
export const QRcodeSchema = BaseEntitySchema.extend({
  config: QrCodeOptionsSchema,
  createdBy: z.string().nullable().optional(),
});
