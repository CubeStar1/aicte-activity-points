CREATE UNIQUE INDEX IF NOT EXISTS idx_objects_current_version_c
  ON storage.objects (bucket_id, name COLLATE "C") WHERE archived_at IS NULL;
