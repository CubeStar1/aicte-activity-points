import type { McpServer, ServerContext } from "@modelcontextprotocol/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { durationDays, totalPoints } from "@/lib/forms/derive";
import { FormError, getForm, mutateForm } from "@/lib/forms/repository";
import {
  ActivityFields,
  MAX_ACTIVITIES,
  MAX_PHOTOS_PER_ACTIVITY,
  activityFieldsSchema,
  signatoriesSchema,
  studentInfoSchema,
} from "@/lib/forms/schema";
import { Activity, FormFillerData } from "@/lib/types/form-filler";
import { UPLOAD_HINT } from "@/lib/upload-limits";
import { createUploadTickets, getUploadedUrl } from "./uploads";

export const SERVER_INSTRUCTIONS = `This server edits one student's AICTE Activity Points form (RVCE). The student's identity comes from their access token; every tool acts on their form only.

Workflow:
1. get_form to see what is already filled in.
2. update_student_info and update_signatories for the header details.
3. add_activity / update_activity for each activity. Serial numbers, durations and total points are computed for you.
4. For photos and certificates: call request_upload, POST each image file to the returned URL from the shell, then attach_photo or set_certificate with the upload_id. Images must be ${UPLOAD_HINT}; convert or resize first if needed.
5. validate_form to check for gaps, then give the student the link it returns. The PDF is generated in the browser from there.

Only record activities, dates, hours and points the student has told you about or that appear in their own files. Do not invent them: the report is signed by faculty.`;

const MAX_UPLOADS_PER_REQUEST = 10;

interface Session {
  userId: string;
  origin: string;
}

const session = (ctx: ServerContext): Session => {
  const extra = ctx.http?.authInfo?.extra as Partial<Session> | undefined;
  if (!extra?.userId || !extra.origin) throw new Error("Not authenticated");
  return { userId: extra.userId, origin: extra.origin };
};

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

// Problems the agent can fix come back as tool errors it can read; anything
// else is a bug or an outage and is logged without leaking details.
const run = async (fn: () => Promise<unknown>) => {
  try {
    return text(await fn());
  } catch (error) {
    if (!(error instanceof FormError)) console.error("MCP tool error:", error);
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text:
            error instanceof FormError
              ? error.message
              : "Something went wrong on the server. Try again.",
        },
      ],
    };
  }
};

const findActivity = (form: FormFillerData, activityId: string) => {
  const activity = form.activities.find((act) => act.id === activityId);
  if (!activity) {
    throw new FormError(
      `No activity with id "${activityId}". Call get_form for the current ids.`
    );
  }
  return activity;
};

const applyFields = (activity: Activity, fields: ActivityFields) => {
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) Object.assign(activity, { [key]: value });
  }
  if (activity.startDate && activity.endDate && activity.endDate < activity.startDate) {
    throw new FormError("endDate is before startDate.");
  }
  activity.duration = durationDays(activity.startDate, activity.endDate);
};

const summarize = (activity: Activity) => ({
  id: activity.id,
  slNo: activity.slNo,
  name: activity.name,
  semester: activity.semester,
  startDate: activity.startDate,
  endDate: activity.endDate,
  hoursSpent: activity.hoursSpent,
  pointsEarned: activity.pointsEarned,
  photoCount: activity.photos.length,
  hasCertificateImage: Boolean(activity.certificateImage),
});

// Some older rows hold images inline as data: URIs, which are far too large to return.
const imageRef = (src: string) => (src.startsWith("data:") ? "(inline image)" : src);

const detail = (activity: Activity) => ({
  id: activity.id,
  slNo: activity.slNo,
  name: activity.name,
  semester: activity.semester,
  aicteMapping: activity.aicteMapping,
  startDate: activity.startDate,
  endDate: activity.endDate,
  durationDays: activity.duration,
  place: activity.place,
  hoursSpent: activity.hoursSpent,
  pointsEarned: activity.pointsEarned,
  detailedReportPageNo: activity.detailedReportPageNo,
  certificateAttached: activity.certificateAttached,
  description: activity.description,
  outcomes: activity.outcomes,
  photos: activity.photos.map((src, index) => ({ index, image: imageRef(src) })),
  certificateImage: activity.certificateImage ? imageRef(activity.certificateImage) : null,
});

const uploadedUrl = async (userId: string, uploadId: string) => {
  const url = await getUploadedUrl(userId, uploadId);
  if (!url) {
    throw new FormError(
      `No finished upload with id "${uploadId}". POST the file to the URL from request_upload first.`
    );
  }
  return url;
};

const findIssues = (form: FormFillerData) => {
  const issues: string[] = [];
  const { student, signatories, activities } = form;

  if (!student.name) issues.push("Student name is missing.");
  if (!student.usn) issues.push("USN is missing.");
  if (!student.department) issues.push("Department is missing.");

  for (const [role, signatory] of Object.entries(signatories)) {
    if (!signatory.name) issues.push(`Signatory "${role}" has no name.`);
  }

  if (activities.length === 0) issues.push("No activities added.");

  for (const activity of activities) {
    const label = `Activity ${activity.slNo} (${activity.name || "unnamed"}, id ${activity.id})`;
    const missing = [
      !activity.name && "name",
      !activity.semester && "semester",
      !activity.aicteMapping && "aicteMapping",
      !activity.startDate && "startDate",
      !activity.endDate && "endDate",
      !activity.place && "place",
      !activity.hoursSpent && "hoursSpent",
      !activity.pointsEarned && "pointsEarned",
      !activity.description && "description",
      !activity.outcomes && "outcomes",
    ].filter(Boolean);

    if (missing.length > 0) issues.push(`${label}: missing ${missing.join(", ")}.`);
    if (activity.photos.length === 0) issues.push(`${label}: no photos attached.`);
    if (activity.certificateAttached && !activity.certificateImage) {
      issues.push(`${label}: marked as having a certificate but no certificate image is attached.`);
    }
  }

  return issues;
};

const activityId = z.string().describe("Activity id from get_form");

export function registerTools(server: McpServer) {
  server.registerTool(
    "get_form",
    {
      description:
        "Read the student's form: student info, signatories, total points and a summary of each activity. Use get_activity for one activity's full text and images.",
      inputSchema: z.object({}),
    },
    (_args, ctx) =>
      run(async () => {
        const form = await getForm(session(ctx).userId);
        return {
          student: { ...form.student, totalPoints: totalPoints(form.activities) },
          signatories: form.signatories,
          activities: form.activities.map(summarize),
        };
      })
  );

  server.registerTool(
    "get_activity",
    {
      description: "Read every field of one activity, including its photos and certificate.",
      inputSchema: z.object({ activity_id: activityId }),
    },
    ({ activity_id }, ctx) =>
      run(async () => detail(findActivity(await getForm(session(ctx).userId), activity_id)))
  );

  server.registerTool(
    "update_student_info",
    {
      description: "Set the student's details. Only the fields you pass are changed.",
      inputSchema: studentInfoSchema,
    },
    (fields, ctx) =>
      run(() =>
        mutateForm(session(ctx).userId, (form) => {
          for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) Object.assign(form.student, { [key]: value });
          }
          return form.student;
        })
      )
  );

  server.registerTool(
    "update_signatories",
    {
      description:
        "Set the name and designation of the two evaluators and the counsellor who sign the report. Only the fields you pass are changed.",
      inputSchema: signatoriesSchema,
    },
    (fields, ctx) =>
      run(() =>
        mutateForm(session(ctx).userId, (form) => {
          for (const role of ["evaluator1", "evaluator2", "counsellor"] as const) {
            const update = fields[role];
            if (!update) continue;
            if (update.name !== undefined) form.signatories[role].name = update.name;
            if (update.designation !== undefined) {
              form.signatories[role].designation = update.designation;
            }
          }
          return form.signatories;
        })
      )
  );

  server.registerTool(
    "add_activity",
    {
      description:
        "Add an activity to the end of the list and return it with its new id. Fields you leave out stay empty and can be filled later with update_activity.",
      inputSchema: activityFieldsSchema,
    },
    (fields, ctx) =>
      run(() =>
        mutateForm(session(ctx).userId, (form) => {
          if (form.activities.length >= MAX_ACTIVITIES) {
            throw new FormError(`A form can have at most ${MAX_ACTIVITIES} activities.`);
          }
          const activity: Activity = {
            id: nanoid(),
            slNo: form.activities.length + 1,
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
          applyFields(activity, fields);
          form.activities.push(activity);
          return detail(activity);
        })
      )
  );

  server.registerTool(
    "update_activity",
    {
      description:
        "Change fields of an existing activity. Only the fields you pass are changed. Photos and certificates are managed with attach_photo, remove_photo, set_certificate and remove_certificate.",
      inputSchema: activityFieldsSchema.extend({ activity_id: activityId }),
    },
    ({ activity_id, ...fields }, ctx) =>
      run(() =>
        mutateForm(session(ctx).userId, (form) => {
          const activity = findActivity(form, activity_id);
          applyFields(activity, fields);
          return detail(activity);
        })
      )
  );

  server.registerTool(
    "delete_activity",
    {
      description:
        "Permanently remove an activity and its attached photos from the form. Confirm with the student first.",
      inputSchema: z.object({ activity_id: activityId }),
    },
    ({ activity_id }, ctx) =>
      run(() =>
        mutateForm(session(ctx).userId, (form) => {
          const activity = findActivity(form, activity_id);
          form.activities = form.activities.filter((act) => act !== activity);
          return { deleted: activity.name || activity_id, remaining: form.activities.length };
        })
      )
  );

  server.registerTool(
    "reorder_activities",
    {
      description:
        "Set the order activities appear in the report. Pass every activity id exactly once, in the new order.",
      inputSchema: z.object({ activity_ids: z.array(z.string()).max(MAX_ACTIVITIES) }),
    },
    ({ activity_ids }, ctx) =>
      run(() =>
        mutateForm(session(ctx).userId, (form) => {
          const byId = new Map(form.activities.map((act) => [act.id, act]));
          const complete =
            activity_ids.length === byId.size &&
            new Set(activity_ids).size === byId.size &&
            activity_ids.every((id) => byId.has(id));
          if (!complete) {
            throw new FormError(
              "activity_ids must list every activity id from get_form exactly once."
            );
          }
          form.activities = activity_ids.map((id) => byId.get(id)!);
          return form.activities.map((act, idx) => ({ slNo: idx + 1, id: act.id, name: act.name }));
        })
      )
  );

  server.registerTool(
    "request_upload",
    {
      description: `Get one-time URLs for uploading image files (activity photos or certificates) from the student's machine. Each URL takes one file: ${UPLOAD_HINT}. POST the file as multipart form field "file", read upload_id from the JSON response, then pass it to attach_photo or set_certificate.`,
      inputSchema: z.object({
        count: z
          .number()
          .int()
          .min(1)
          .max(MAX_UPLOADS_PER_REQUEST)
          .default(1)
          .describe("How many files you are about to upload"),
      }),
    },
    ({ count }, ctx) =>
      run(async () => {
        const { userId, origin } = session(ctx);
        const { tickets, expiresInMinutes } = await createUploadTickets(userId, count);
        return {
          upload_urls: tickets.map(({ ticket }) => `${origin}/api/upload?ticket=${ticket}`),
          expires_in_minutes: expiresInMinutes,
          how_to_upload:
            'curl -sS -F "file=@/path/to/photo.jpg" "<upload_url>"  (in Windows PowerShell use curl.exe). The response is {"upload_id": "..."} or {"error": "..."}; a URL whose upload failed can be retried.',
          limits: UPLOAD_HINT,
        };
      })
  );

  server.registerTool(
    "attach_photo",
    {
      description: "Add an uploaded image to an activity's photos.",
      inputSchema: z.object({
        activity_id: activityId,
        upload_id: z.string().describe("upload_id returned by the upload URL"),
      }),
    },
    ({ activity_id, upload_id }, ctx) =>
      run(async () => {
        const { userId } = session(ctx);
        const url = await uploadedUrl(userId, upload_id);
        return mutateForm(userId, (form) => {
          const activity = findActivity(form, activity_id);
          if (activity.photos.includes(url)) {
            throw new FormError("That upload is already attached to this activity.");
          }
          if (activity.photos.length >= MAX_PHOTOS_PER_ACTIVITY) {
            throw new FormError(
              `An activity can have at most ${MAX_PHOTOS_PER_ACTIVITY} photos.`
            );
          }
          activity.photos.push(url);
          return { activity_id, photoCount: activity.photos.length };
        });
      })
  );

  server.registerTool(
    "remove_photo",
    {
      description:
        "Remove one photo from an activity by its index (from get_activity). Indexes of later photos shift down by one.",
      inputSchema: z.object({
        activity_id: activityId,
        photo_index: z.number().int().min(0),
      }),
    },
    ({ activity_id, photo_index }, ctx) =>
      run(() =>
        mutateForm(session(ctx).userId, (form) => {
          const activity = findActivity(form, activity_id);
          if (photo_index >= activity.photos.length) {
            throw new FormError(
              `This activity has ${activity.photos.length} photo(s); index ${photo_index} doesn't exist.`
            );
          }
          activity.photos.splice(photo_index, 1);
          return { activity_id, photoCount: activity.photos.length };
        })
      )
  );

  server.registerTool(
    "set_certificate",
    {
      description:
        "Set an uploaded image as an activity's certificate, replacing any existing one, and mark the certificate as available.",
      inputSchema: z.object({
        activity_id: activityId,
        upload_id: z.string().describe("upload_id returned by the upload URL"),
      }),
    },
    ({ activity_id, upload_id }, ctx) =>
      run(async () => {
        const { userId } = session(ctx);
        const url = await uploadedUrl(userId, upload_id);
        return mutateForm(userId, (form) => {
          const activity = findActivity(form, activity_id);
          activity.certificateImage = url;
          activity.certificateAttached = true;
          return { activity_id, certificateAttached: true };
        });
      })
  );

  server.registerTool(
    "remove_certificate",
    {
      description: "Remove an activity's certificate image and mark the certificate as not available.",
      inputSchema: z.object({ activity_id: activityId }),
    },
    ({ activity_id }, ctx) =>
      run(() =>
        mutateForm(session(ctx).userId, (form) => {
          const activity = findActivity(form, activity_id);
          activity.certificateImage = "";
          activity.certificateAttached = false;
          return { activity_id, certificateAttached: false };
        })
      )
  );

  server.registerTool(
    "validate_form",
    {
      description:
        "Check the form for missing details before the student generates the report. Returns the list of gaps, the total points, and the link where the student previews and downloads the PDF.",
      inputSchema: z.object({}),
    },
    (_args, ctx) =>
      run(async () => {
        const { userId, origin } = session(ctx);
        const form = await getForm(userId);
        const issues = findIssues(form);
        return {
          ready: issues.length === 0,
          issues,
          totalPoints: totalPoints(form.activities),
          activityCount: form.activities.length,
          report_url: `${origin}/form-filler`,
          next_step:
            "Ask the student to open report_url while signed in, check the preview and click Download PDF. If the page was already open, they must reload it first to pick up these changes.",
        };
      })
  );
}
