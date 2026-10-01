"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { RefreshCw, Loader2, Github, Eye, Bot } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FormFillerData } from "@/lib/types/form-filler";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ActivityList } from "@/components/form-filler/activity-list";
import { FormSectionHeader } from "@/components/form-filler/form-section-header";
import { StudentInfoForm } from "@/components/form-filler/student-info-form";
import { SignatoriesForm } from "@/components/form-filler/signatories-form";
import { GuideDialog } from "@/components/form-filler/guide-dialog";

import { DownloadPDFButton } from "@/components/form-filler/download-pdf-button";
import { loadFormData, saveFormData, migrateLocalStorageData } from "@/lib/supabase/form-persistence";
import useUser from "@/hooks/use-user";
import { toast } from "sonner";
import { emptyFormData, totalPoints as sumPoints, withDerived } from "@/lib/forms/derive";

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

interface FormContentProps {
  form: UseFormReturn<FormFillerData>;
  totalPoints: number;
  handleGeneratePreview: () => void;
  isGenerating: boolean;
  pdfContent?: React.ReactNode;
  previewData: FormFillerData;
}

const FormContent = ({
  form,
  totalPoints,
  handleGeneratePreview,
  isGenerating,
  pdfContent,
  previewData,
}: FormContentProps) => {
  const { register, setValue, control, getValues } = form;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GuideDialog />

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              window.open(
                "https://github.com/CubeStar1/aicte-activity-points",
                "_blank"
              )
            }
          >
            <Github className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link href="/connect">
              <Bot className="w-5 h-5" />
              <span className="hidden sm:inline">Connect agent</span>
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[90vh] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>PDF Preview</SheetTitle>
                </SheetHeader>
                <div className="h-full bg-muted/50 p-4 overflow-hidden">
                  {pdfContent}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <DownloadPDFButton data={previewData} />

          <Button
            onClick={() => handleGeneratePreview()}
            size="sm"
            className="gap-2"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isGenerating ? "Saving & Generating..." : "Save & Generate Preview"}
            </span>
            <span className="sr-only">{isGenerating ? "..." : "Generate"}</span>
          </Button>
        </div>
      </div>

      <StudentInfoForm
        register={register}
        setValue={setValue}
        totalPoints={totalPoints}
      />

      <div>
        <FormSectionHeader title="Activity Details" />
        <Card>
          <CardContent className="pt-0">
            <ActivityList
              control={control}
              register={register}
              setValue={setValue}
              getValues={getValues}
            />
          </CardContent>
        </Card>
      </div>

      <SignatoriesForm register={register} />
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
  const totalPoints = sumPoints(activities);

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
      {/* Mobile Layout */}
      <div className="block md:hidden h-full">
        <ScrollArea className="h-full">
          <FormContent
            form={form}
            totalPoints={totalPoints}
            handleGeneratePreview={() => handleGeneratePreview()}
            isGenerating={isGenerating}
            pdfContent={<PDFPreview data={previewData} />}
            previewData={previewData}
          />
        </ScrollArea>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={45} minSize={30} maxSize={70}>
            <ScrollArea className="h-full">
              <FormContent
                form={form}
                totalPoints={totalPoints}
                handleGeneratePreview={() => handleGeneratePreview()}
                isGenerating={isGenerating}
                pdfContent={<PDFPreview data={previewData} />}
                previewData={previewData}
              />
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={55} minSize={30} maxSize={70}>
            <div className="h-full">
              <PDFPreview data={previewData} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
