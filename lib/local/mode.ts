/**
 * Local mode (`NEXT_PUBLIC_LOCAL_MODE=true`): no sign-in, no Supabase, no
 * Azure. The app serves a single user whose form and uploads live on disk in
 * `.local-data/`. Meant for running on your own machine only: anyone who can
 * reach the server can read and edit the form.
 *
 * Kept free of Node imports so the middleware and client code can use it.
 */
export const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === "true";

export const LOCAL_USER_ID = "local";

export const LOCAL_FILES_PATH = "/api/local/files";
