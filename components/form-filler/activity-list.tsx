"use client";

import { useState } from "react";
import {
  Control,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, X, Table2, Loader2, ListPlus, Rows3, LayoutGrid } from "lucide-react";
import {
  FormFillerData,
  Activity,
  SEMESTERS,
  AICTE_CATEGORIES,
} from "@/lib/types/form-filler";
import { nanoid } from "nanoid";
import { differenceInDays, parseISO } from "date-fns";
import useUser from "@/hooks/use-user";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  MAX_UPLOAD_MB,
  UPLOAD_ACCEPT,
  UPLOAD_HINT,
  validateUpload,
} from "@/lib/upload-limits";
import { BulkEditDialog } from "./bulk-edit-dialog";
import { ActivityCard } from "./activity-card";
import { FormSectionHeader } from "./form-section-header";
import { SortableTableRow } from "./sortable-row";

type ActivityView = "table" | "cards";
const VIEW_STORAGE_KEY = "form-filler:activity-view";

const readSavedView = (key: string): ActivityView | null => {
  try {
    const saved = localStorage.getItem(key);
    return saved === "table" || saved === "cards" ? saved : null;
  } catch {
    return null;
  }
};

const DialogSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-4 border-t pt-5 first:border-t-0 first:pt-0">
    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {title}
    </h4>
    {children}
  </section>
);

const uploadFile = async (file: File) => {
  const body = new FormData();
  body.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body });
  } catch {
    throw new Error("Network error. Check your connection and try again.");
  }

  // The host can reject a request before it reaches the route, with a non-JSON body.
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.url) {
    throw new Error(
      data?.error ||
        (res.status === 413
          ? `Larger than ${MAX_UPLOAD_MB} MB.`
          : "Upload failed. Please try again.")
    );
  }

  return data.url as string;
};

interface ActivityListProps {
  control: Control<FormFillerData>;
  register: UseFormRegister<FormFillerData>;
  setValue: UseFormSetValue<FormFillerData>;
  getValues: UseFormGetValues<FormFillerData>;
}

const defaultActivity: Omit<Activity, "id" | "slNo"> = {
  semester: "",
  name: "",
  aicteMapping: "",
  startDate: "",
  endDate: "",
  duration: 0,
  place: "",
  detailedReportPageNo: "",
  certificateAttached: false,
  certificateImage: "",
  hoursSpent: 0,
  pointsEarned: 0,
  description: "",
  photos: [],
  outcomes: "",
  signatureOfCounsellor: "",
};

export function ActivityList({
  control,
  register,
  setValue,
  getValues,
}: ActivityListProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities",
  });


  const { data: user } = useUser();

  const activities = useWatch({
    control,
    name: "activities",
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  // Cards by default on mobile, table on desktop; a choice is remembered
  // separately for each so one doesn't override the other.
  const isMobile = useIsMobile();
  const viewKey = `${VIEW_STORAGE_KEY}:${isMobile ? "mobile" : "desktop"}`;
  const [chosenView, setChosenView] = useState<Record<string, ActivityView>>({});
  const view: ActivityView =
    chosenView[viewKey] ?? readSavedView(viewKey) ?? (isMobile ? "cards" : "table");

  const changeView = (next: ActivityView) => {
    setChosenView((prev) => ({ ...prev, [viewKey]: next }));
    try {
      localStorage.setItem(viewKey, next);
    } catch {
      // Storage unavailable; the choice just won't persist.
    }
  };
  const [uploadingPhotos, setUploadingPhotos] = useState(0);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const isUploading = uploadingPhotos > 0 || uploadingCertificate;

  // Uploads every valid file and reports each rejected or failed one by name.
  const uploadFiles = async (files: File[]) => {
    const failed: string[] = [];
    const valid = files.filter((file) => {
      const invalid = validateUpload(file);
      if (invalid) failed.push(`${file.name}: ${invalid}`);
      return !invalid;
    });

    const results = await Promise.allSettled(valid.map(uploadFile));
    const urls: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        urls.push(result.value);
      } else {
        console.error("Error uploading file", result.reason);
        failed.push(`${valid[i].name}: ${result.reason.message}`);
      }
    });

    if (failed.length > 0) {
      toast.error(
        failed.length === 1 ? "Upload failed" : `${failed.length} uploads failed`,
        {
          description: failed.join("\n"),
          descriptionClassName: "whitespace-pre-line",
          duration: 8000,
        }
      );
    }
    return urls;
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    if (!user?.id) {
      toast.error("Please log in to upload images.");
      input.value = "";
      return;
    }

    setUploadingPhotos(files.length);
    try {
      const urls = await uploadFiles(files);
      if (urls.length > 0) {
        const currentPhotos = getValues(`activities.${index}.photos`) || [];
        setValue(`activities.${index}.photos`, [...currentPhotos, ...urls]);
        toast.success(
          `${urls.length} photo${urls.length === 1 ? "" : "s"} uploaded`
        );
      }
    } finally {
      setUploadingPhotos(0);
      input.value = "";
    }
  };

  const handleCertificateUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!user?.id) {
      toast.error("Please log in to upload certificate.");
      input.value = "";
      return;
    }

    setUploadingCertificate(true);
    try {
      const [url] = await uploadFiles([file]);
      if (url) {
        setValue(`activities.${index}.certificateImage`, url);
        setValue(`activities.${index}.certificateAttached`, true);
        toast.success("Certificate uploaded");
      }
    } finally {
      setUploadingCertificate(false);
      input.value = "";
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);

      const currentActivities = getValues("activities");
      const reorderedActivities = arrayMove(currentActivities, oldIndex, newIndex);

      // Update slNo for all activities
      const updatedActivities = reorderedActivities.map((act, idx) => ({
        ...act,
        slNo: idx + 1,
      }));

      setValue("activities", updatedActivities);
    }
  };

  const handleBulkEdit = (updates: Partial<Activity>[]) => {
    const currentActivities = getValues("activities");
    const updatedActivities = currentActivities.map((activity, index) => ({
      ...activity,
      ...updates[index],
    }));
    setValue("activities", updatedActivities);
  };

  const addActivity = () => {
    append({
      ...defaultActivity,
      id: nanoid(),
      slNo: fields.length + 1,
    });
    setEditingIndex(fields.length);
    setIsDialogOpen(true);
  };

  const editActivity = (index: number) => {
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  const deleteActivity = (index: number) => {
    remove(index);
    if (editingIndex === index) {
      setIsDialogOpen(false);
      setEditingIndex(-1);
    } else if (editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleDateChange = (
    index: number,
    field: "startDate" | "endDate",
    value: string
  ) => {
    const otherField = field === "startDate" ? "endDate" : "startDate";
    const otherValue = getValues(`activities.${index}.${otherField}`);

    if (value && otherValue) {
      const start = field === "startDate" ? value : otherValue;
      const end = field === "startDate" ? otherValue : value;
      const days = differenceInDays(parseISO(end), parseISO(start)) + 1;
      setValue(`activities.${index}.duration`, days);
    }
  };

  return (
    <div>
      <FormSectionHeader
        title="Activity Details" />

      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={view}
            onValueChange={(value) => value && changeView(value as ActivityView)}
            aria-label="Activity layout"
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <Rows3 />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Card view">
              <LayoutGrid />
            </ToggleGroupItem>
          </ToggleGroup>
          <span className="text-sm text-muted-foreground tabular-nums">
            {fields.length} {fields.length === 1 ? "activity" : "activities"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setBulkEditOpen(true)}
            size="sm"
            variant="outline"
            disabled={fields.length === 0}
            aria-label="Bulk edit"
          >
            <Table2 />
            <span className="hidden @md:inline">Bulk edit</span>
          </Button>
          <Button type="button" onClick={addActivity} size="sm" aria-label="Add activity">
            <Plus />
            <span className="hidden @sm:inline">Add activity</span>
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ListPlus className="size-5" />
          </div>
          <div>
            <p className="font-medium">No activities yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add each activity you took part in. You need 100 points in total.
            </p>
          </div>
          <Button type="button" onClick={addActivity} size="sm">
            <Plus />
            Add activity
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {view === "table" ? (
              <div className="overflow-hidden rounded-xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-16 pl-4">Sl.</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead className="text-center">Sem</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                      <TableHead className="w-20 pr-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <SortableTableRow
                        key={field.id}
                        id={field.id}
                        index={index}
                        activity={activities?.[index] || {}}
                        onEdit={() => editActivity(index)}
                        onDelete={() => deleteActivity(index)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <ol className="space-y-2">
                {fields.map((field, index) => (
                  <ActivityCard
                    key={field.id}
                    id={field.id}
                    index={index}
                    activity={activities?.[index] || {}}
                    onEdit={() => editActivity(index)}
                    onDelete={() => deleteActivity(index)}
                  />
                ))}
              </ol>
            )}
          </SortableContext>
        </DndContext>
      )}

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        activities={activities || []}
        onApplyChanges={handleBulkEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>
              {editingIndex >= 0
                ? `Edit Activity ${editingIndex + 1}`
                : "Activity Details"}
            </DialogTitle>
          </DialogHeader>

          {editingIndex >= 0 && (
            <>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <DialogSection title="Basics">
                <div className="space-y-2">
                  <Label>Activity Name</Label>
                  <Input
                    {...register(`activities.${editingIndex}.name`)}
                    placeholder="e.g., Blood Donation Camp"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="col-span-2 space-y-2 sm:col-span-1">
                    <Label>Semester</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue(`activities.${editingIndex}.semester`, value)
                      }
                      defaultValue={getValues(`activities.${editingIndex}.semester`)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEMESTERS.map((sem) => (
                          <SelectItem key={sem} value={sem}>
                            Sem {sem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Hours Spent</Label>
                    <Input
                      type="number"
                      {...register(`activities.${editingIndex}.hoursSpent`, {
                        valueAsNumber: true,
                      })}
                      placeholder="e.g. 50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Points</Label>
                    <Input
                      type="number"
                      {...register(`activities.${editingIndex}.pointsEarned`, {
                        valueAsNumber: true,
                      })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>AICTE Category</Label>
                  <Select
                    onValueChange={(value) => {
                      if (value === "__manual__") {
                        setValue(`activities.${editingIndex}.aicteMapping`, "");
                      } else {
                        setValue(`activities.${editingIndex}.aicteMapping`, value);
                      }
                    }}
                    value={
                      (AICTE_CATEGORIES as readonly string[]).includes(getValues(`activities.${editingIndex}.aicteMapping`))
                        ? getValues(`activities.${editingIndex}.aicteMapping`)
                        : "__manual__"
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select AICTE Category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {AICTE_CATEGORIES.map((category, idx) => (
                        <SelectItem key={idx} value={category}>
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground shrink-0">{idx + 1}.</span>
                            <span className="line-clamp-2">{category}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="__manual__">
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground shrink-0">✏️</span>
                          <span className="font-medium">Other (Enter Manually)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {!(AICTE_CATEGORIES as readonly string[]).includes(getValues(`activities.${editingIndex}.aicteMapping`)) && (
                    <Input
                      {...register(`activities.${editingIndex}.aicteMapping`)}
                      placeholder="Enter custom AICTE category..."
                      className="mt-2"
                    />
                  )}
                </div>
              </DialogSection>

              <DialogSection title="When and where">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      {...register(`activities.${editingIndex}.startDate`, {
                        onChange: (e) =>
                          handleDateChange(editingIndex, "startDate", e.target.value),
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      {...register(`activities.${editingIndex}.endDate`, {
                        onChange: (e) =>
                          handleDateChange(editingIndex, "endDate", e.target.value),
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Place</Label>
                  <Input
                    {...register(`activities.${editingIndex}.place`)}
                    placeholder="RVCE Campus"
                  />
                </div>
              </DialogSection>

              <DialogSection title="Report">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Report Page No</Label>
                    <Input
                      {...register(`activities.${editingIndex}.detailedReportPageNo`)}
                      placeholder="e.g. 1-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Certificate Available</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue(
                          `activities.${editingIndex}.certificateAttached`,
                          value === "yes"
                        )
                      }
                      value={activities?.[editingIndex]?.certificateAttached ? "yes" : "no"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    {...register(`activities.${editingIndex}.description`)}
                    placeholder="Describe the activity..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Outcomes</Label>
                  <Textarea
                    {...register(`activities.${editingIndex}.outcomes`)}
                    placeholder="What did you learn?"
                  />
                </div>
              </DialogSection>

              <DialogSection title="Attachments">
                <div className="space-y-2">
                  <Label>Activity Photos</Label>

                  {(activities?.[editingIndex]?.photos || []).length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {activities?.[editingIndex]?.photos?.map((photo, pIdx) => (
                        <div key={pIdx} className="relative group border rounded-md overflow-hidden aspect-video bg-muted">
                          <img
                            src={photo}
                            alt={`Photo ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            aria-label={`Remove photo ${pIdx + 1}`}
                            onClick={() => {
                              const currentPhotos = getValues(`activities.${editingIndex}.photos`) || [];
                              const newPhotos = currentPhotos.filter((_, i) => i !== pIdx);
                              setValue(`activities.${editingIndex}.photos`, newPhotos);
                            }}
                            className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Input
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    multiple
                    disabled={uploadingPhotos > 0}
                    className="cursor-pointer"
                    onChange={(e) => handlePhotoUpload(e, editingIndex)}
                  />
                  {uploadingPhotos > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading {uploadingPhotos} photo{uploadingPhotos === 1 ? "" : "s"}...
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">
                      {UPLOAD_HINT} each. {(activities?.[editingIndex]?.photos || []).length} photos attached
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Certificate Image</Label>

                  {activities?.[editingIndex]?.certificateImage ? (
                    <div className="relative group border rounded-md overflow-hidden aspect-[4/3] bg-muted w-1/2 mb-2">
                      <img
                        src={activities[editingIndex].certificateImage!}
                        alt="Certificate"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        aria-label="Remove certificate"
                        onClick={() => {
                          setValue(`activities.${editingIndex}.certificateImage`, "");
                          setValue(`activities.${editingIndex}.certificateAttached`, false);
                        }}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}

                  <Input
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    disabled={uploadingCertificate}
                    className="cursor-pointer"
                    onChange={(e) => handleCertificateUpload(e, editingIndex)}
                  />
                  {uploadingCertificate ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading certificate...
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">
                      {UPLOAD_HINT}.
                      {activities?.[editingIndex]?.certificateImage && (
                        <span className="text-emerald-600 dark:text-emerald-400"> Certificate attached</span>
                      )}
                    </div>
                  )}
                </div>
              </DialogSection>

            </div>

            <div className="flex justify-end border-t px-6 py-3">
              <Button onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Done"}
              </Button>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
