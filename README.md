# BillWatch

BillWatch is a bill tracking and payment-management application with document scanning, reminders, reporting, AI-assisted bill parsing, and ecosystem integrations.

## Stack

- React, Vite, and Express
- Neon PostgreSQL with Drizzle ORM
- Clerk authentication
- Vercel hosting and scheduled reminders

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and provide the required settings.
3. Apply the database schema with `npm run db:push`.
4. Start the application with `npm run dev`.

Never commit `.env` files or service credentials. Production settings are managed through Vercel environment variables.
