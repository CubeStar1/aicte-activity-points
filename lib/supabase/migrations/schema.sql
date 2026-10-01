

insert into storage.buckets
  (id, name, public)
values
  ('activity-evidence', 'activity-evidence', true);

CREATE POLICY "Allow authenticated uploads to own folder"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'activity-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'activity-evidence'
);

-- Activity Forms Table
CREATE TABLE IF NOT EXISTS activity_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  form_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_forms_user_id ON activity_forms(user_id);

-- Enable Row Level Security
ALTER TABLE activity_forms ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own forms
CREATE POLICY "Users can view own forms"
  ON activity_forms
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own forms
CREATE POLICY "Users can insert own forms"
  ON activity_forms
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own forms
CREATE POLICY "Users can update own forms"
  ON activity_forms
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own forms
CREATE POLICY "Users can delete own forms"
  ON activity_forms
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_activity_forms_timestamp ON activity_forms;
CREATE TRIGGER update_activity_forms_timestamp
  BEFORE UPDATE ON activity_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_forms_updated_at();

-- Agent (MCP) access: personal access tokens and one-time upload tickets.
-- Both tables are only touched server-side with the service role key, so RLS
-- is enabled with no policies.

CREATE TABLE IF NOT EXISTS mcp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  -- SHA-256 of the token; the token itself is shown once and never stored.
  token_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_user_id ON mcp_tokens(user_id);

ALTER TABLE mcp_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS mcp_uploads (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticket_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  -- Set when the ticket is redeemed, so each ticket uploads at most one file.
  used_at TIMESTAMP WITH TIME ZONE,
  -- Set once the file is stored.
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_uploads_user_id ON mcp_uploads(user_id);

ALTER TABLE mcp_uploads ENABLE ROW LEVEL SECURITY;
