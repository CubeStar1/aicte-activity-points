"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "form-filler:mobile-notice-dismissed";
const MOBILE_QUERY = "(max-width: 767px)";

export function MobileNoticeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // Storage unavailable (e.g. private mode): still show the notice
    }
    setOpen(true);
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted sm:mx-0">
            <Monitor className="size-5" />
          </div>
          <DialogTitle>Better on a desktop</DialogTitle>
          <DialogDescription>
            The form filler works on mobile, but it&apos;s easier on a larger
            screen, where you can edit the form and see the PDF preview side by
            side.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)}>Continue on mobile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
