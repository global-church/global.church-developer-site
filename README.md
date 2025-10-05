# Global.Church Index - Developer Showcase

This Next.js application serves as the primary developer showcase and interactive explorer for the Global.Church platform. It demonstrates the capabilities of the open-source [Global.Church Schema](https://trentsikute.github.io/globalchurch-schema/) and the accompanying [Church Database API](https://global-church-main-ba4d06e.zuplo.site).

## Overview

The goal of Global.Church is to break down data silos within the FaithTech ecosystem by providing a standardized data model and a powerful, free-to-use API for accessing a global database of church information. This application is the first reference implementation, built using the same tools that will be available to the wider Christian developer community.

## Key Features

- **Explorer:** An interactive map and search tool to explore the church database, powered by our API.
- **Schema Documentation:** Clear explanations and a direct link to the versioned schema on GitHub.
- **API Playground:** A link to our Zuplo-powered API playground for live query testing.
- **Admin Portal (prototype):** Password-protected dashboard for searching and editing churches.

## Getting Started

First, install the dependencies:

````bash
npm install
````

Next, create a `.env.local` file in the project root and add any required environment variables. You can copy the example file if it exists:

```
cp .env.example .env.local
```

Finally, run the development server (with Turbopack):

```bash
npm run dev
```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) with your browser to see the result.

## Admin Portal Prototype

Set up the admin dashboard by configuring the following environment variables in `.env.local`:

```
ADMIN_PORTAL_PASSWORD=change-me
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional override if your table name differs
# ADMIN_SUPABASE_CHURCHES_TABLE=churches
```

Then visit [http://localhost:3000/admin](http://localhost:3000/admin) and unlock the portal with the password. Record updates require a Supabase service role key; without it, the UI will surface an actionable error.

## Deploy on Vercel

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

```
