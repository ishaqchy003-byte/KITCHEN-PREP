# Kitchen Prep Control

A simple restaurant kitchen prep system built with **Vite + React**.

## What this app includes

- Branch selection page
- Current branches: **Orpington** and **Swanley**
- Option to add future branches
- Branch dashboard with 4 options:
  - Current Leftovers
  - Assign Today’s Prep
  - Staff Prep Update
  - Prep List Setup
- Code-protected manager, staff and setup pages
- Editable access codes from Setup
- Editable categories, items and kitchen units from Setup
- Add/delist/restore categories and items without changing code
- Daal stays under Cooked Ingredients, but can be shown separately
- Prep date included to track old batches
- Staff update page uses dashboard/table style
- Unit field uses dropdown/scrollable menu
- No “condition” field and no “updated by” field

## Important limitation

This first version uses browser `localStorage`.

That means:

- It works locally.
- It works on Vercel as a demo.
- It saves data on the same browser/device.
- It does **not** sync live between different staff/manager phones yet.

For real restaurant use across multiple devices, the next upgrade should connect it to **Supabase** or **Firebase**.

## Default access codes

### Owner code

```text
OWNER2026
```

### Orpington

```text
Staff code: ORP-247
Manager code: ORP-MANAGER
Setup code: ORP-ADMIN
```

### Swanley

```text
Staff code: SWA-247
Manager code: SWA-MANAGER
Setup code: SWA-ADMIN
```

You can change these codes inside:

```text
Prep List Setup > Access Codes
```

## How to run locally

Open the folder in VS Code, then run:

```bash
npm install
npm run dev
```

Then open the link shown in the terminal, usually:

```text
http://localhost:5173
```

## How to build for Vercel

Run:

```bash
npm run build
```

If it builds successfully, you can upload to GitHub and connect the repo to Vercel.

## Git commands

```bash
git init
git add .
git commit -m "Initial kitchen prep control app"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_LINK_HERE
git push -u origin main
```

Replace `YOUR_GITHUB_REPO_LINK_HERE` with your GitHub repository URL.

