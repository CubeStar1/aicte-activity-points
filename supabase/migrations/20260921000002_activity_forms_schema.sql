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
