import { openAPI } from "~/server/infrastructure/openAPI";

export async function GET() {
  return new Response(JSON.stringify(openAPI), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
