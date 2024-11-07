/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  BadRequestError,
  CustomApiError,
} from "~/server/application/errors/http";
import { logger } from "~/server/infrastructure/logger";

export async function ApiErrorHandler(
  callback: (req: NextRequest) => Promise<Response>,
  req: NextRequest,
) {
  try {
    return await callback(req);
  } catch (e: unknown) {
    let responsePayload: any = {
      message: "An unexpected error occurred",
    };
    let statusCode = 500;

    if (e instanceof CustomApiError) {
      statusCode = e.statusCode;
      responsePayload = {
        message: e.message,
        code: e.statusCode,
      };
      if (e instanceof BadRequestError) {
        responsePayload.fieldErrors = e.zodIssues;
      }
    } else if (e instanceof ZodError) {
      statusCode = 400;
      responsePayload = {
        message: "Validation error",
        fieldErrors: e.issues,
      };
    } else if (e instanceof Error) {
      console.error("Unexpected error:", e);
    }

    logger.error("API Error occurred", {
      ...responsePayload as object,
      url: req.url,
    });

    return new Response(JSON.stringify(responsePayload), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
