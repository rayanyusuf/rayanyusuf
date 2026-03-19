# Supabase setup for saving answers

This lets the **admin Solution Key** tab save confirmed answer images and the **Answers** library + **tool page** load them when users tap "Show answer".

---

## 1. Run the SQL in Supabase

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Create a new query and paste the contents of **`supabase/answers-storage-setup.sql`** (see below).
4. Click **Run**.

That script will:

- Create the **`answers`** table (if it doesn’t exist).
- Ensure the **`problem-images`** bucket exists (used for both problems and answers).
- Add **storage policies** so the app (using the anon key) can:
  - **Upload** answer images (admin).
  - **Read** them (admin + tool page signed URLs).

---

## 2. If the bucket doesn’t exist yet

If you haven’t created **`problem-images`** before:

- The SQL script tries to create it.
- If you prefer the UI: go to **Storage** → **New bucket** → name: **`problem-images`** → leave it **private** (the app uses signed URLs).

---

## 3. Where answers are stored

| What              | Where                                                                 |
|-------------------|-----------------------------------------------------------------------|
| **Bucket**        | `problem-images` (same as problems)                                  |
| **Paths**         | `answers/confirmed/<answer_id>.png` (e.g. `answers/confirmed/Further-Maths-2020-paper-1-Question-5.png`) |
| **Database table**| `public.answers` with columns `answer_id`, `answer_image`, `created_at` |

`answer_image` stores the **path** in the bucket (e.g. `answers/confirmed/Further-Maths-2020-paper-1-Question-5.png`).

---

## 4. Optional: restrict by path

The default policies allow **all** access to the `problem-images` bucket for the anon role. If you want to limit anon to only the `answers/` prefix (or to specific operations), you can replace the broad policies with ones that use `name` (e.g. `name like 'answers/%'`). The script in **`answers-storage-setup.sql`** uses the simpler “full bucket” rules so admin and tool both work without extra config.

---

## 5. Check it works

- **Admin:** Open **Answers**, upload a PDF, convert, crop, and confirm an answer. No errors and a new row in **Table Editor → `answers`** and a new object under **Storage → problem-images → answers/confirmed/**.
- **Tool:** Open **/tool**, start then stop the timer, tap **Show answer** for a question that has an answer row; the answer image should load.
