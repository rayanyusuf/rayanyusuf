# Fix: `Could not find the table 'public.answers' in the schema cache`

That message means **PostgREST** (Supabase’s REST API) doesn’t know about `public.answers` yet — usually because **the table was never created in this project**, or the API cache hasn’t refreshed.

## 1. Use the correct Supabase project

In [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings** → **API**:

- Copy **Project URL** and **anon public** key.

They must match your app’s `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). If the keys are from another project, you’ll keep seeing errors.

## 2. Create the table (SQL Editor)

1. Open **SQL Editor** in the **same** project.
2. **New query**.
3. Paste and run **everything** in `supabase/answers-table.sql` (same folder as this file).

You should see **Success** with no errors.

## 3. Confirm the table exists

**Table Editor** → schema **public** → you should see **`answers`** with columns:

- `answer_id` (text, PK)  
- `answer_image` (text)  
- `created_at` (timestamptz)

If it’s not there, the SQL didn’t run in this project — repeat step 2.

## 4. Refresh the API schema cache

The SQL file ends with:

```sql
notify pgrst, 'reload schema';
```

That usually fixes “schema cache” within seconds.

If the error persists:

- Wait **1–2 minutes** and try the app again, or  
- **Dashboard** → **Project Settings** → **API** → look for **Restart** / **Pause & restore** (last resort).

## 5. Storage (optional, for uploads)

If you can query `answers` but **uploads fail**, run `supabase/answers-storage-setup.sql` (creates bucket policies for `problem-images`).

---

**TL;DR:** Run `answers-table.sql` in the Supabase SQL Editor for the project whose URL/key is in `.env.local`, then confirm `answers` appears under **Table Editor**.
