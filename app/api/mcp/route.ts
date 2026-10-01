import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, getPublicOrigin, withMcpAuth } from "mcp-handler";
import { SERVER_INSTRUCTIONS, registerTools } from "@/lib/mcp/tools";
import { verifyToken } from "@/lib/mcp/tokens";
import { LOCAL_MODE, LOCAL_USER_ID } from "@/lib/local/mode";

const handler = createMcpHandler(registerTools, {
  serverInfo: { name: "aicte-activity-points", version: "1.0.0" },
  instructions: SERVER_INSTRUCTIONS,
});

// Tokens are the personal access tokens students create on /connect.
// Local mode has a single user and takes any caller as them, token or not.
const verify = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  const userId = LOCAL_MODE
    ? LOCAL_USER_ID
    : bearerToken
      ? await verifyToken(bearerToken)
      : null;
  if (!userId) return undefined;

  return {
    token: bearerToken ?? "",
    clientId: userId,
    scopes: [],
    extra: { userId, origin: getPublicOrigin(req) },
  };
};

const authHandler = withMcpAuth(handler, verify, { required: true });

export { authHandler as GET, authHandler as POST };
