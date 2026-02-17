## BugHerd-like Dashboard (MVP)

This is a **Next.js (App Router) + Supabase** app implementing a BugHerd-style dashboard.

### Features (current)

- **Supabase Auth** (email + password)
- **Kanban board** (Backlog / Todo / Doing / Done) (in progress)
- **Add task modal** (in progress)
- **Browser extension (MVP)** (in progress)

### Tech stack

- **Next.js** (frontend + backend via route handlers)
- **Supabase** (Auth + Postgres with RLS)
- **Tailwind CSS**
- **Vercel** (hosting)

## Getting Started

### 1) Create a Supabase project and set env vars

Create a project in Supabase, then add a `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

You can copy `.env.example`.

### 2) Create database schema (tasks table + RLS)

In Supabase SQL Editor, run:

- `supabase/schema.sql`

### 2b) (Optional) Enable extension screenshots + metadata

If you will use the extension to capture element screenshots, run:

- `supabase/extension_tasks_metadata_and_storage.sql`

### 3) Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Browser Extension (MVP)

The extension lives in `extension/` and works like a simplified BugHerd sidebar:

- Right-side slider (on any website)
- **Create task** → hover highlights elements → click element → crops screenshot
- Opens an **Add task** modal and creates the task in Supabase

### Configure

Edit:

- `extension/config.js`

Set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Load unpacked (Chrome / Edge)

1. Open Extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder

### Notes

- You must **sign in inside the extension** (it uses Supabase Auth + RLS).
- The screenshot bucket is `task-screenshots` (created by the SQL above).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
