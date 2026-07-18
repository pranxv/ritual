import crypto from "node:crypto";

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

/**
 * Generates an S256 PKCE pair for the Swiggy MCP OAuth 2.1 authorize flow.
 * codeVerifier must be retained in memory until the token exchange step —
 * never persisted to disk.
 */
export function generatePkcePair(): PkcePair {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}
