import { createSupabaseBrowser } from "./client";
import { FormFillerData } from "../types/form-filler";

export interface ActivityForm {
  id: string;
  user_id: string;
  form_data: FormFillerData;
  created_at: string;
  updated_at: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  /** The form changed in the database since it was loaded; nothing was saved. */
  conflict?: boolean;
  /** The row's new `updated_at`, to pass as `loadedAt` on the next save. */
  updatedAt?: string;
}

/**
 * Save form data to Supabase
 * Creates new entry if doesn't exist, updates if exists
 *
 * `loadedAt` is the `updated_at` this tab last saw (null if it saw no row).
 * When given, the save is refused if the row has changed since, so edits made
 * elsewhere (another tab, or the student's agent over MCP) aren't overwritten.
 */
export async function saveFormData(
  formData: FormFillerData,
  loadedAt?: string | null
): Promise<SaveResult> {
  try {
    const supabase = createSupabaseBrowser();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Check if form exists
    const { data: existingForm } = await supabase
      .from("activity_forms")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingForm) {
      if (loadedAt === null) {
        return { success: false, conflict: true };
      }

      // Update existing form
      let update = supabase
        .from("activity_forms")
        .update({ form_data: formData })
        .eq("user_id", user.id);
      if (loadedAt) update = update.eq("updated_at", loadedAt);

      const { data: saved, error } = await update.select("updated_at");

      if (error) {
        console.error("Error updating form:", error);
        return { success: false, error: error.message };
      }
      if (saved.length === 0) {
        return { success: false, conflict: true };
      }
      return { success: true, updatedAt: saved[0].updated_at };
    }

    // Insert new form
    const { data: inserted, error } = await supabase
      .from("activity_forms")
      .insert({
        user_id: user.id,
        form_data: formData,
      })
      .select("updated_at")
      .single();

    if (error) {
      console.error("Error creating form:", error);
      return { success: false, error: error.message };
    }

    return { success: true, updatedAt: inserted.updated_at };
  } catch (error) {
    console.error("Error in saveFormData:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load form data from Supabase
 */
export async function loadFormData(): Promise<{ data?: FormFillerData; updatedAt?: string; error?: string }> {
  try {
    const supabase = createSupabaseBrowser();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "User not authenticated" };
    }

    // Load form data
    const { data, error } = await supabase
      .from("activity_forms")
      .select("form_data, updated_at")
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No data found - this is not an error
        return { data: undefined };
      }
      console.error("Error loading form:", error);
      return { error: error.message };
    }

    return { data: data.form_data as FormFillerData, updatedAt: data.updated_at };
  } catch (error) {
    console.error("Error in loadFormData:", error);
    return { error: String(error) };
  }
}

/**
 * Migrate data from localStorage to Supabase
 */
export async function migrateLocalStorageData(): Promise<{ success: boolean; migrated: boolean; error?: string }> {
  try {
    // Check if there's data in localStorage
    const localData = localStorage.getItem("aicte-form-data");
    if (!localData) {
      return { success: true, migrated: false };
    }

    // Check if user already has data in database
    const { data: dbData } = await loadFormData();
    if (dbData) {
      // User already has data in database, don't overwrite
      return { success: true, migrated: false };
    }

    // Parse and save localStorage data to database
    const parsedData = JSON.parse(localData) as FormFillerData;
    const result = await saveFormData(parsedData);

    if (result.success) {
      // Migration successful, we can optionally clear localStorage
      // localStorage.removeItem("aicte-form-data");
      return { success: true, migrated: true };
    }

    return { success: false, migrated: false, error: result.error };
  } catch (error) {
    console.error("Error migrating localStorage data:", error);
    return { success: false, migrated: false, error: String(error) };
  }
}

/**
 * Debounce utility for auto-save
 */
export function createDebouncedSave(delay: number = 30000) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (formData: FormFillerData) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      const result = await saveFormData(formData);
      if (result.success) {
        console.log("Form auto-saved successfully");
      } else {
        console.error("Auto-save failed:", result.error);
      }
    }, delay);
  };
}
