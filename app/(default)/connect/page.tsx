"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Check, Copy, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AGENT_PROMPT } from "@/lib/mcp/agent-prompt";
import type { McpTokenInfo } from "@/lib/mcp/tokens";

const TOKEN_PLACEHOLDER = "<your-token>";

function CopyBlock({ value, scroll }: { value: string; scroll?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <pre
        className={`overflow-x-auto rounded-md border bg-muted p-3 pr-12 text-xs whitespace-pre-wrap ${
          scroll ? "max-h-96 overflow-y-auto break-words" : "break-all"
        }`}
      >
        {value}
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1"
        onClick={copy}
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        <span className="sr-only">Copy</span>
      </Button>
    </div>
  );
}

const formatDate = (value: string | null) =>
  value ? format(parseISO(value), "d MMM yyyy") : "never";

export default function ConnectPage() {
  const [tokens, setTokens] = useState<McpTokenInfo[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  // Only held in memory: the server keeps a hash and can't show it again.
  const [newToken, setNewToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const loadTokens = useCallback(async () => {
    const res = await fetch("/api/agent-tokens");
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error || "Failed to load tokens");
      setTokens([]);
      return;
    }
    setTokens(data.tokens);
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    loadTokens();
  }, [loadTokens]);

  const createToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/agent-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "My agent" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || "Failed to create token");
        return;
      }
      setNewToken(data.token);
      setName("");
      await loadTokens();
    } finally {
      setCreating(false);
    }
  };

  const revokeToken = async (token: McpTokenInfo) => {
    const res = await fetch(`/api/agent-tokens?id=${token.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to revoke token");
      return;
    }
    toast.success(`Revoked "${token.name}"`);
    await loadTokens();
  };

  const mcpUrl = `${origin}/api/mcp`;
  const token = newToken ?? TOKEN_PLACEHOLDER;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <Button variant="ghost" size="sm" className="gap-2" asChild>
        <Link href="/form-filler">
          <ArrowLeft className="w-4 h-4" />
          Back to form
        </Link>
      </Button>

      <PageHeader
        title="Connect your agent"
        description="Let a coding agent (Claude Code, Cursor, Codex and others) fill in your activity points form over MCP: add activities, upload photos and certificates, and check for gaps. You then download the PDF here as usual."
      />

      <Card>
        <CardHeader>
          <CardTitle>1. Create an access token</CardTitle>
          <CardDescription>
            A token lets an agent read and edit your form, and nothing else. Treat
            it like a password and revoke it when you are done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={createToken} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="token-name">Token name</Label>
              <Input
                id="token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Claude Code on my laptop"
                maxLength={60}
              />
            </div>
            <Button type="submit" disabled={creating} className="gap-2">
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create token
            </Button>
          </form>

          {newToken && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Copy your token now. It won&apos;t be shown again.
              </p>
              <CopyBlock value={newToken} />
            </div>
          )}

          {tokens === null ? (
            <p className="text-sm text-muted-foreground">Loading tokens...</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tokens yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {tokens.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.prefix}… · created {formatDate(item.created_at)} · last used{" "}
                      {formatDate(item.last_used_at)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive"
                    onClick={() => revokeToken(item)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Add the server to your agent</CardTitle>
          <CardDescription>
            {newToken
              ? "These snippets include the token you just created."
              : `Replace ${TOKEN_PLACEHOLDER} with a token from step 1.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="claude">
            <TabsList>
              <TabsTrigger value="claude">Claude Code</TabsTrigger>
              <TabsTrigger value="cursor">Cursor</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
            </TabsList>
            <TabsContent value="claude" className="space-y-2">
              <p className="text-sm text-muted-foreground">Run this in a terminal:</p>
              <CopyBlock
                value={`claude mcp add --transport http aicte-activity-points ${mcpUrl} --header "Authorization: Bearer ${token}"`}
              />
            </TabsContent>
            <TabsContent value="cursor" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Add this to <code>.cursor/mcp.json</code>:
              </p>
              <CopyBlock
                value={JSON.stringify(
                  {
                    mcpServers: {
                      "aicte-activity-points": {
                        url: mcpUrl,
                        headers: { Authorization: `Bearer ${token}` },
                      },
                    },
                  },
                  null,
                  2
                )}
              />
            </TabsContent>
            <TabsContent value="other" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Any agent that supports remote MCP servers over Streamable HTTP works.
                Give it this URL and header:
              </p>
              <CopyBlock value={`${mcpUrl}\nAuthorization: Bearer ${token}`} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Give your agent this prompt</CardTitle>
          <CardDescription>
            Put your notes, photos and certificates in one folder, open your agent in
            that folder, and paste this prompt. It works as it is; add anything
            specific to you at the end.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyBlock value={AGENT_PROMPT} scroll />
          <p className="text-sm text-muted-foreground">
            The agent will show you its plan and ask about anything it can&apos;t find
            before it writes. When it is done, reload the form page to see its
            changes, check the preview and download the PDF. Review what it wrote:
            your counsellor signs this report.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
