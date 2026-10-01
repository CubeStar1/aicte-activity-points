import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminCheck } from "@/lib/admin/auth";

const MESSAGES: Record<
  Extract<AdminCheck, { ok: false }>["reason"],
  { title: string; body: string }
> = {
  unauthenticated: {
    title: "Sign in required",
    body: "You need to be signed in to view the admin dashboard.",
  },
  "not-configured": {
    title: "No admins configured",
    body: "Set ADMIN_EMAILS in your environment to a comma-separated list of admin email addresses, then restart the server.",
  },
  forbidden: {
    title: "Not authorised",
    body: "Your account is not on the admin list for this deployment.",
  },
};

export function AdminGate({
  reason,
}: {
  reason: Extract<AdminCheck, { ok: false }>["reason"];
}) {
  const { title, body } = MESSAGES[reason];

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <ShieldAlert className="mx-auto size-10 text-muted-foreground" />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
          {reason === "unauthenticated" && (
            <Button asChild>
              <Link href="/signin?next=/dashboard">Sign in</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
