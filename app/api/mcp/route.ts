import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, getPublicOrigin, withMcpAuth } from "mcp-handler";
import { SERVER_INSTRUCTIONS, registerTools } from "@/lib/mcp/tools";
import { verifyToken } from "@/lib/mcp/tokens";

const handler = createMcpHandler(registerTools, {
  serverInfo: { name: "aicte-activity-points", version: "1.0.0" },
  instructions: SERVER_INSTRUCTIONS,
});

// Tokens are the personal access tokens students create on /connect.
const verify = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  const userId = await verifyToken(bearerToken);
  if (!userId) return undefined;

  return {
    token: bearerToken,
    clientId: userId,
    scopes: [],
    extra: { userId, origin: getPublicOrigin(req) },
  };
};

const authHandler = withMcpAuth(handler, verify, { required: true });

export { authHandler as GET, authHandler as POST };
