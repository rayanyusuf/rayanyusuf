# A Level Mathematics - Video Gallery

A modern web gallery showcasing A Level Mathematics past paper solutions and tutorials.

Created by a student at British School Dhahran, Saudi Arabia.

## Features

- 🎥 Embedded YouTube video gallery
- 📱 Fully responsive design
- 🌙 Dark mode support
- ⚡ Built with Next.js 16 and Tailwind CSS

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication (Supabase)

The **practice tool** (`/tool`) requires a Supabase Auth user (email + password). Sign-in and sign-up live at **`/auth`**.

1. In the [Supabase dashboard](https://supabase.com/dashboard) → **Authentication** → **URL configuration**:
   - Set **Site URL** to your deployed origin (e.g. `https://your-domain.vercel.app`) or `http://localhost:3000` for local dev.
   - Under **Redirect URLs**, add:
     - `http://localhost:3000/auth/callback`
     - `https://your-domain.vercel.app/auth/callback` (your production URL)

2. Env vars (e.g. `.env.local`):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Admin** (`/admin` and sub-routes) still uses the server env password via `POST /api/auth/login` and `PASSWORD` — separate from learner accounts.

## Deployment

This project is deployed on [Vercel](https://vercel.com). The easiest way to deploy your own copy is to use the Vercel Platform.

1. Push this repository to GitHub
2. Import the project on [Vercel](https://vercel.com/new)
3. Deploy with one click!

## Project Structure

- `src/app/page.tsx` - Main page with video gallery
- `src/app/layout.tsx` - Root layout and metadata
- `src/app/globals.css` - Global styles

## Technologies

- [Next.js](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [TypeScript](https://www.typescriptlang.org) - Type safety
