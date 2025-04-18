import { type ClassValue, clsx } from "clsx";
import type { Options } from "qr-code-styling";
import type { TQrCodeOptions } from "qrcodly-api-types";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toSnakeCaseKeys(obj: object) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [toSnakeCase(key), value]),
  );
}

export const svgToBase64 = (svgString: string): string => {
  const base64 = window.btoa(svgString);
  return `data:image/svg+xml;base64,${base64}`;
};

export function convertQrCodeOptionsToLibraryOptions(
  options: TQrCodeOptions,
): Options {
  return {
    shape: "square",
    width: options.width,
    height: options.height,
    image: options.image,
    type: "canvas",
    margin: options.margin,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "Q",
    },
    imageOptions: {
      hideBackgroundDots: options.imageOptions.hideBackgroundDots,
      imageSize: 0.4,
      margin: 30,
      crossOrigin: "anonymous",
    },
    dotsOptions: {
      ...(typeof options.dotsOptions.style === "object"
        ? {
            gradient: options.dotsOptions.style,
            color: undefined,
          }
        : { color: options.dotsOptions.style, gradient: undefined }),
      type: options.dotsOptions.type,
    },
    backgroundOptions: {
      ...(typeof options.backgroundOptions.style === "object"
        ? {
            gradient: options.backgroundOptions.style,
            color: undefined,
          }
        : { color: options.backgroundOptions.style, gradient: undefined }),
    },
    cornersSquareOptions: {
      ...(typeof options.cornersSquareOptions.style === "object"
        ? {
            gradient: options.cornersSquareOptions.style,
            color: undefined,
          }
        : { color: options.cornersSquareOptions.style, gradien: undefined }),
      type: options.cornersSquareOptions.type,
    },
    cornersDotOptions: {
      ...(typeof options.cornersDotOptions.style === "object"
        ? {
            gradient: options.cornersDotOptions.style,
            color: undefined,
          }
        : { color: options.cornersDotOptions.style, gradient: undefined }),
      type: options.cornersDotOptions.type,
    },
  };
}

/**
 * Compares two values for deep equality.
 * @param {*} value1 - The first value to compare.
 * @param {*} value2 - The second value to compare.
 * @returns {boolean} - Returns true if the values are deeply equal, otherwise false.
 */
function deepEqual(value1: unknown, value2: unknown): boolean {
  // Check if both values are objects (arrays or objects)
  if (typeof value1 === "object" && typeof value2 === "object") {
    return JSON.stringify(value1) === JSON.stringify(value2);
  }
  // For non-objects, use strict equality
  return value1 === value2;
}

/**
 * Computes the difference between two objects.
 * @param {Object} obj1 - The first object.
 * @param {Object} obj2 - The second object.
 * @param {Array<string>} [ignoreProperties=[]] - An array of property names to ignore.
 * @returns {Object} - An object representing the differences. Each key in the returned object
 *                     corresponds to a property that differs between obj1 and obj2, with the
 *                     old and new values.
 */
export function objDiff(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  ignoreProperties: string[] = [],
) {
  const diff: Record<string, { oldValue: unknown; newValue: unknown }> = {};

  for (const key in obj1) {
    // Skip the properties in the ignoreProperties array
    if (ignoreProperties.includes(key)) {
      continue;
    }
    // Compare the properties using deepEqual
    if (!deepEqual(obj1[key], obj2[key])) {
      diff[key] = {
        oldValue: obj1[key],
        newValue: obj2[key],
      };
    }
  }

  return diff;
}
