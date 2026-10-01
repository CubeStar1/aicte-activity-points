import { MAX_UPLOAD_MB } from "@/lib/upload-limits";

export const AGENT_PROMPT = `I need your help filling in my AICTE Activity Points report. I'm an engineering student at RVCE, and before I graduate I have to submit a report of the community and outreach activities I did during my degree: what each activity was, when and where, how many hours, how many points it earned, with photos and certificates as evidence. My counsellor and two evaluators sign it, so everything in it has to be true and has to match my evidence.

The report lives in a web app, and you can edit my form in it through the "aicte-activity-points" MCP server. Your job is to get the form complete and accurate. I'll download the PDF from the website myself afterwards, so you don't need to produce any document.

## Where my material is

Everything I have is in the current folder and its subfolders: notes, photos, certificates, maybe old reports or chat exports. Start by exploring it and reading whatever looks relevant, including looking at the images, so you know what evidence exists for which activity. If the folder has nothing useful, tell me and I'll describe my activities to you directly.

## How to work

1. Call get_form first. I may have filled in part of the form already. Keep what is there and build on it; don't recreate activities that already exist, and don't delete or overwrite anything of mine without asking.

2. Before you write anything, show me a short plan: the list of activities you found, with the dates, hours, points, photos and certificate you intend to use for each, and a list of what you couldn't find. Wait for me to confirm or correct it. This is the step where I catch mistakes, so make it easy to scan.

3. Fill in my details and the signatories (two evaluators and my counsellor, each with a name and designation). If you can't find these in my files, ask me. Don't guess names.

4. Add or update each activity. For every one I need:
   - a clear name, the semester I did it in, the start and end dates, and the place
   - the AICTE category it falls under. Use one of the standard categories the tool lists when one fits; only write a custom one if none does
   - hours spent and points earned
   - a description of what the activity involved and what I personally did, and the outcomes: what changed for the people involved and what I learned
   Write the description and outcomes in first person, in plain formal English, a solid paragraph each (roughly 80 to 150 words). Be specific to what actually happened, using the details from my notes, rather than generic statements that could describe any activity.

5. Attach evidence. For each photo or certificate, call request_upload, send the file to the URL it gives you from the shell, then call attach_photo or set_certificate with the upload_id you get back. Aim for two to four photos per activity that clearly show it happening. Uploads only accept JPG or PNG up to ${MAX_UPLOAD_MB} MB, so convert other formats (HEIC, WEBP, PDF certificates) and resize large photos first, saving the converted copies in a temporary folder rather than changing my originals.

6. Order the activities chronologically with reorder_activities, unless I ask for a different order.

7. Call validate_form and fix every gap you can. Repeat until it comes back clean or only the things you need from me are left.

## What I need you to be careful about

- Never invent facts. Dates, hours, points, places, names and whether a certificate exists must come from my files or from me. If something is missing or two sources disagree, ask me instead of picking a plausible value. A blank field I can fill in later is far better than a made-up one that a faculty member signs.
- Points and hours are decided by my college's rules, not by you. Use the numbers in my material; if they aren't there, ask.
- Only attach a photo to an activity when you're confident it belongs to it (from the file name, folder, date or what the image shows). If you're unsure, ask me.
- Only mark a certificate as available when you have actually attached its image.
- Ask your questions in batches rather than one at a time, so I can answer them in one go.

## When you're done

Give me a summary: a table of the activities with their dates, hours and points, the total points, what you attached to each, and a clear list of anything still missing or that you were unsure about. Then give me the link that validate_form returns. I'll open it, reload the page, check the preview and download the PDF.`;
