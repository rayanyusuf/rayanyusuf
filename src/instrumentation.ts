/**
 * Load .env.local at server startup so OPEN_AI_API_KEY is available in API routes.
 * Next.js 16 / Turbopack sometimes does not load .env.local for the Node server process.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const path = await import("path");
    const dotenv = await import("dotenv");
    const envPath = path.join(process.cwd(), ".env.local");
    dotenv.config({ path: envPath });
  }
}
