

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