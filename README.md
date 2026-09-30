# StudyMate AI — Stage 1

Your Personal AI Study Companion.

Stage 1 includes:
- React + TypeScript + Vite frontend
- Node.js + Express + TypeScript backend
- PostgreSQL database
- JWT authentication
- bcrypt password hashing
- Student profile
- Subjects
- Protected dashboard
- Responsive UI
- Dark/light mode
- API health check

Later stages will add:
1. Study materials upload and text extraction
2. PYQ upload and analysis
3. AI Tutor
4. OpenAI integration
5. AI study planner
6. Quizzes
7. Progress analytics
8. Smart rescheduling
9. Chat history
10. Admin panel

## Requirements

- Node.js 20+
- PostgreSQL 15+
- npm

## Project structure

```text
StudyMate-AI-Stage1/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── server/
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── db.ts
│   │   ├── index.ts
│   │   └── types.ts
│   ├── sql/
│   │   └── schema.sql
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── README.md
```

## 1. Create the database

Create a PostgreSQL database named `studymate`.

Then run:

```bash
psql -U postgres -d studymate -f server/sql/schema.sql
```

If `psql` is not available, open pgAdmin, create the `studymate` database, open Query Tool, paste `server/sql/schema.sql`, and execute it.

## 2. Configure the backend

Copy:

```text
server/.env.example
```

to:

```text
server/.env
```

Set:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/studymate
JWT_SECRET=replace_this_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Do not commit `.env`.

## 3. Install backend dependencies

```bash
cd server
npm install
```

## 4. Start backend

```bash
npm run dev
```

Backend runs at:

http://localhost:5000

Health check:

http://localhost:5000/api/health

## 5. Install frontend dependencies

Open another terminal:

```bash
cd client
npm install
```

## 6. Start frontend

```bash
npm run dev
```

Open the URL shown by Vite, normally:

http://localhost:5173

## Authentication

Register a new account from the Register page, then login.

The frontend stores the JWT in localStorage for this student project. For a production deployment, use secure, HttpOnly cookies instead.

## Important

The OpenAI API is NOT enabled in Stage 1. We will add it in a later stage. Never place an OpenAI API key in frontend code.

OpenAI's current API platform uses the Responses API and supports current models through the official SDKs. When we add AI, the API key will remain server-side in an environment variable.
