import { swagger } from "~/server/infrastructure/swagger";

export async function GET() {
  return new Response(JSON.stringify(swagger), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
