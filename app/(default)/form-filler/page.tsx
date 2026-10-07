"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Save, Loader2, Eye, Sparkles } from "lucide-react";
import { SiGithub } from "react-icons/si";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Activity, FormFillerData } from "@/lib/types/form-filler";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ActivityList } from "@/components/form-filler/activity-list";
import { PointsSummary } from "@/components/form-filler/points-summary";
import { StudentInfoForm } from "@/components/form-filler/student-info-form";
import { SignatoriesForm } from "@/components/form-filler/signatories-form";
import { GuideDialog } from "@/components/form-filler/guide-dialog";
import { ToolbarMenu } from "@/components/form-filler/toolbar-menu";
import { MobileNoticeDialog } from "@/components/form-filler/mobile-notice-dialog";

import { DownloadPDFButton } from "@/components/form-filler/download-pdf-button";
import { loadFormData, saveFormData, migrateLocalStorageData } from "@/lib/supabase/form-persistence";
import useUser from "@/hooks/use-user";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { emptyFormData, withDerived } from "@/lib/forms/derive";

const PDFPreview = dynamic(
  () =>
    import("@/components/form-filler/pdf-preview").then((mod) => mod.PDFPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading PDF viewer...
      </div>
    ),
  }
);

// Button treatments for the glass toolbar. Each button is a 32px circle until
// the bar is wide enough for its label, so the bar never overflows on mobile.
const glassGhost =
  "rounded-full text-foreground/75 hover:bg-foreground/10 hover:text-foreground dark:hover:bg-white/10";
const glassChip =
  "rounded-full border-black/10 bg-white/50 shadow-none hover:bg-white/90 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20";
const fitNav = "w-8 px-0 has-[>svg]:px-0 @[760px]:w-auto @[760px]:px-3 @[760px]:has-[>svg]:px-3";
// Preview keeps a small label on phones, since an eye icon alone is ambiguous.
const fitPreview =
  "w-8 gap-1 px-0 text-xs has-[>svg]:px-0 @[350px]:w-auto @[350px]:px-2.5 @[350px]:has-[>svg]:px-2.5 @[540px]:gap-1.5 @[540px]:px-3 @[540px]:text-sm @[540px]:has-[>svg]:px-3";
const fitDownload = "w-8 px-0 has-[>svg]:px-0 @[620px]:w-auto @[620px]:px-3 @[620px]:has-[>svg]:px-3";
const fitSave = "w-8 px-0 has-[>svg]:px-0 @[460px]:w-auto @[460px]:px-3 @[460px]:has-[>svg]:px-3";

interface FormContentProps {
  form: UseFormReturn<FormFillerData>;
  activities: Activity[];
  handleGeneratePreview: () => void;
  isGenerating: boolean;
  pdfContent?: React.ReactNode;
  previewData: FormFillerData;
}

const FormContent = ({
  form,
  activities,
  handleGeneratePreview,
  isGenerating,
  pdfContent,
  previewData,
}: FormContentProps) => {
  const { register, setValue, control, getValues } = form;

  return (
    <div>
      {/* Floating glass bar: the form scrolls underneath and blurs through. */}
      <div className="@container pointer-events-none sticky top-0 z-20 px-4 pt-3 md:px-6">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-2 rounded-full border border-black/5 bg-white/55 p-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_10px_30px_-12px_rgb(0_0_0/0.25)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.1),0_10px_30px_-10px_rgb(0_0_0/0.8)]">
          <div className="flex items-center gap-0.5">
            <ToolbarMenu className={glassGhost} />
            <div className="mx-1 h-4 w-px shrink-0 bg-foreground/15" />
            <GuideDialog className={cn(glassGhost, fitNav)} />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className={cn(glassGhost, fitNav)} asChild>
                  <a
                    href="https://github.com/CubeStar1/aicte-activity-points"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View source on GitHub"
                  >
                    <SiGithub />
                    <span className="hidden @[760px]:inline">GitHub</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>View source on GitHub</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-full text-violet-600 hover:bg-violet-500/15 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-violet-500/20 dark:hover:text-violet-300",
                    fitNav
                  )}
                  asChild
                >
                  <Link href="/connect" aria-label="Connect agent">
                    <Sparkles />
                    <span className="hidden @[760px]:inline">Connect agent</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Connect agent</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1">
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(glassChip, fitPreview)}
                    aria-label="Preview PDF"
                  >
                    <Eye />
                    <span className="hidden @[350px]:inline">Preview</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="data-[side=bottom]:h-[90dvh] p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>PDF Preview</SheetTitle>
                  </SheetHeader>
                  <div className="min-h-0 flex-1 bg-muted/50 p-4 overflow-hidden">
                    {pdfContent}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <DownloadPDFButton data={previewData} className={cn(glassChip, fitDownload)} />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleGeneratePreview()}
                  size="sm"
                  className={cn("h-8 gap-1.5 rounded-full px-3 shadow-sm", fitSave)}
                  disabled={isGenerating}
                  aria-label="Save & Generate Preview"
                >
                  {isGenerating ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="hidden @[460px]:inline">
                    {isGenerating ? "Saving..." : "Save & Preview"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save & Generate Preview</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="@container">
        <div className="mx-auto max-w-3xl space-y-8 px-4 pt-5 pb-10 md:px-6">
          <PointsSummary activities={activities} />

          <StudentInfoForm
            control={control}
            register={register}
            setValue={setValue}
          />

          <ActivityList
            control={control}
            register={register}
            setValue={setValue}
            getValues={getValues}
          />

          <SignatoriesForm register={register} />
        </div>
      </div>
    </div>
  );
};

export default function FormFillerPage() {
  const [mounted, setMounted] = useState(false);
  const { data: user } = useUser();


  const form = useForm<FormFillerData>({
    defaultValues: emptyFormData(),
  });

  const { watch, getValues, reset } = form;

  const [previewData, setPreviewData] = useState<FormFillerData>(emptyFormData);

  // `updated_at` of the row as this tab last saw it (null: no row yet), so a
  // save can tell when the form was changed elsewhere in the meantime.
  const loadedAt = useRef<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const activities = watch("activities");

  const handleGeneratePreview = useCallback((data?: FormFillerData) => {
    const values = data || getValues();

    // Save to database if user is authenticated. Freshly loaded data is
    // already what the database holds, so only the user's own edits are saved.
    if (user && !data) {
      saveFormData(values, loadedAt.current).then(({ success, error, conflict, updatedAt }) => {
        if (success) {
          loadedAt.current = updatedAt ?? loadedAt.current;
          toast.success("Form saved");
        } else if (conflict) {
          toast.error("Not saved: this form was changed somewhere else", {
            description:
              "For example by your coding agent or another tab. Reload to get the latest version; changes made here since then will be lost.",
            duration: Infinity,
            action: { label: "Reload", onClick: () => window.location.reload() },
          });
        } else {
          toast.error("Failed to save: " + error);
        }
      });
    }

    const newPreviewData = withDerived(values);

    setIsGenerating(true);
    setTimeout(() => {
      setPreviewData(newPreviewData);
      setIsGenerating(false);
    }, 600);
  }, [getValues, user]);



  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Try to migrate localStorage data first
      await migrateLocalStorageData();

      // Load from database
      const { data: dbData, updatedAt, error } = await loadFormData();
      loadedAt.current = updatedAt ?? null;
      if (dbData) {
        reset(dbData);
        handleGeneratePreview(dbData);
        toast.success("Form loaded");
      } else if (error) {
        console.error("Error loading from database:", error);
        toast.error("Failed to load data");
      }
      
      setMounted(true);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!mounted) return null;

  return (
    <div className="h-[calc(100vh)] bg-background">
      <MobileNoticeDialog />

      {/* Mobile Layout */}
      <div className="block md:hidden h-full">
        <ScrollArea className="h-full [&_[data-slot=scroll-area-viewport]>div]:block!">
          <FormContent
            form={form}
            activities={activities}
            handleGeneratePreview={() => handleGeneratePreview()}
            isGenerating={isGenerating}
            pdfContent={<PDFPreview data={previewData} />}
            previewData={previewData}
          />
        </ScrollArea>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-full">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel defaultSize="45%" minSize="30%" maxSize="70%">
            <ScrollArea className="h-full [&_[data-slot=scroll-area-viewport]>div]:block!">
              <FormContent
                form={form}
                activities={activities}
                handleGeneratePreview={() => handleGeneratePreview()}
                isGenerating={isGenerating}
                pdfContent={<PDFPreview data={previewData} />}
                previewData={previewData}
              />
            </ScrollArea>
          </ResizablePanel>

          {/* No seam line: the preview's own rounded edge is the divider. */}
          <ResizableHandle withHandle className="z-10 bg-transparent" />

          {/* The preview is an inset card, so the form's surface reads as
              continuing behind it. */}
          <ResizablePanel defaultSize="55%" minSize="30%" maxSize="70%">
            <div className="h-full py-2 pr-2">
              <div className="h-full overflow-hidden rounded-2xl border bg-muted shadow-sm">
                <PDFPreview data={previewData} />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
