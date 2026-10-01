# AICTE Activity Points Report Generator

A tool for generating AICTE Activity Points forms for RVCE students

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/CubeStar1/aicte-activity-points.git
   ```

2. **Setup Services**

   - Create a project on [Supabase](https://supabase.com)
   - Create an account on [Resend](https://resend.com) for email services

3. **Run Database Migration**

   Copy the contents of `lib/supabase/migrations/schema.sql` and run it in the Supabase SQL Editor to set up the database schema and storage buckets.

4. **Setup Environment Variables**

   Copy the example environment file to `.env.local` and configure the keys using credentials from Supabase and Resend:

   ```bash
   cp env.example .env.local
   ```

5. **Install dependencies**

   ```bash
   npm install
   ```

6. **Run the development server**

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Troubleshooting

### Uploads fail with `DatabaseError` (500) on local Supabase

When running Supabase locally (`supabase start`), image and certificate uploads can fail with a `500 DatabaseError` response. The Storage container logs show:

```
42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

This is a bug in local `storage-api` v1.77.0, not in this app. Its upload query upserts with `ON CONFLICT (bucket_id, name COLLATE "C") WHERE archived_at IS NULL`, but its own schema migrations leave behind a unique index on `(bucket_id, name)` without `COLLATE "C"`, so Postgres can't match the two. Hosted Supabase projects are not affected.

**Fix:** create the matching index as `supabase_admin`. Running it from the Studio SQL editor fails with `42501: must be owner of table objects`, because Studio queries run as `postgres`.

```bash
docker exec supabase_db_aicte-activity-points psql -U supabase_admin -d postgres -c 'CREATE UNIQUE INDEX IF NOT EXISTS idx_objects_current_version_c ON storage.objects (bucket_id, name COLLATE "C") WHERE archived_at IS NULL;'
```

Only the index is added; nothing else changes. Run the command again after `supabase db reset` or after recreating the database volume, since both remove it. You can drop the index once a newer Storage release fixes the mismatch.
