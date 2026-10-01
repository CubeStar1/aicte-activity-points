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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Pencil, X, GripVertical, Table2, Loader2 } from "lucide-react";
import {
  FormFillerData,
  Activity,
  SEMESTERS,
  AICTE_CATEGORIES,
} from "@/lib/types/form-filler";
import { nanoid } from "nanoid";
import { differenceInDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import useUser from "@/hooks/use-user";
import { toast } from "sonner";
import {
  MAX_UPLOAD_MB,
  UPLOAD_ACCEPT,
  UPLOAD_HINT,
  validateUpload,
} from "@/lib/upload-limits";
import { BulkEditDialog } from "./bulk-edit-dialog";
import { SortableTableRow } from "./sortable-row";


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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activities ({fields.length})</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => setBulkEditOpen(true)}
            size="sm"
            variant="outline"
            disabled={fields.length === 0}
          >
            <Table2 className="w-4 h-4 mr-2" />
            Bulk Edit
          </Button>
          <Button type="button" onClick={addActivity} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </div>

      {/* Mobile View - Cards */}
      <div className="space-y-4 md:hidden">
        {fields.length === 0 ? (
          <div className="text-center p-6 text-muted-foreground border rounded-md border-dashed">
            No activities added. Tap "Add Activity" to start.
          </div>
        ) : (
          fields.map((field, index) => {
            const activity = activities?.[index] || {};
            const dateRange =
              activity.startDate && activity.endDate
                ? `${activity.startDate} to ${activity.endDate}`
                : "-";

            return (
              <Card key={field.id} className="overflow-hidden">
                <CardHeader className="p-4 bg-muted/50 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-semibold text-base line-clamp-2">
                      {activity.name || "Untitled Activity"}
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => editActivity(index)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteActivity(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Semester:</span>
                    <span>{activity.semester || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Points:</span>
                    <span className="font-medium">{activity.pointsEarned || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dates:</span>
                    <span>{dateRange}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Desktop View - Table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="hidden md:block border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Sl.</TableHead>
                <TableHead className="w-[100px]">Activity Name</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Sem</TableHead>
                <TableHead>Points</TableHead>
                <TableHead className="text-right w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center h-24 text-muted-foreground"
                  >
                    No activities added. Click "Add Activity" to start.
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext
                  items={fields.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {fields.map((field, index) => {
                    const activity = activities?.[index] || {};
                    const dateRange =
                      activity.startDate && activity.endDate
                        ? `${activity.startDate} to ${activity.endDate}`
                        : "-";

                    return (
                      <SortableTableRow
                        key={field.id}
                        id={field.id}
                        index={index}
                        activity={activity}
                        dateRange={dateRange}
                        onEdit={() => editActivity(index)}
                        onDelete={() => deleteActivity(index)}
                      />
                    );
                  })}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        activities={activities || []}
        onApplyChanges={handleBulkEdit}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingIndex >= 0
                ? `Edit Activity ${editingIndex + 1}`
                : "Activity Details"}
            </DialogTitle>
          </DialogHeader>

          {editingIndex >= 0 && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select
                    onValueChange={(value) =>
                      setValue(`activities.${editingIndex}.semester`, value)
                    }
                    defaultValue={getValues(`activities.${editingIndex}.semester`)}
                  >
                    <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Activity Name</Label>
                <Input
                  {...register(`activities.${editingIndex}.name`)}
                  placeholder="e.g., Blood Donation Camp"
                />
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
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Detailed Report Page No</Label>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
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
                          onClick={() => {
                            const currentPhotos = getValues(`activities.${editingIndex}.photos`) || [];
                            const newPhotos = currentPhotos.filter((_, i) => i !== pIdx);
                            setValue(`activities.${editingIndex}.photos`, newPhotos);
                          }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                      onClick={() => {
                        setValue(`activities.${editingIndex}.certificateImage`, "");
                        setValue(`activities.${editingIndex}.certificateAttached`, false);
                      }}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                      <span className="text-green-600"> Certificate attached</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                  {isUploading ? "Uploading..." : "Done"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
