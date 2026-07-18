import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return val;
}

export const env = {
  swiggyMcpServerUrl: required("SWIGGY_MCP_SERVER_URL"), // e.g. https://mcp.swiggy.com/food
  swiggyClientId: required("SWIGGY_CLIENT_ID"),
  swiggyRedirectUri: process.env.SWIGGY_REDIRECT_URI ?? "http://localhost:8787/callback",
  ritualEnv: process.env.RITUAL_ENV ?? "sandbox",
};
