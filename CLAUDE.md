# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (React + Vite)
```bash
cd frontend
npm install          # install deps
npm run dev          # dev server at http://localhost:5173
npm run build        # production build
npm run lint         # ESLint
npm run preview      # preview production build
```

### Backend (Node.js/Express)
```bash
cd backend
npm install          # install deps
npm run dev          # nodemon dev server at http://localhost:5000
npm start            # production start
npm run seed         # seed MongoDB with sample data
npm test             # run test-openrouter.js (AI connectivity check)
```

## Architecture

SkillBuddy is a dual-role AI-powered learning platform. **Students** follow personalized AI-generated learning paths; **teachers** create courses, upload documents for AI question generation, and monitor class analytics.

### Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7, Framer Motion, Recharts
- **Backend**: Node.js/Express on port 5000, MongoDB Atlas (Mongoose)
- **AI**: OpenRouter API with `qwen/qwen-2.5-7b-instruct` for learning paths, quizzes, and doubts
- **Auth**: JWT stored in `localStorage`, OTP-based email verification via Gmail/Nodemailer

### Frontend → Backend Connection
`frontend/src/api/axios.js` — base URL hardcoded to `http://localhost:5000/api`. A request interceptor auto-attaches `Authorization: Bearer {token}` from localStorage. No Vite proxy.

### Auth Flow
1. Register → OTP email sent → verify OTP → JWT issued → stored in localStorage
2. `AuthContext` (`frontend/src/context/AuthContext.jsx`) holds global `user` + `loading` state; auto-validates token on app load via `GET /auth/me`
3. `ProtectedRoute` component redirects unauthenticated users to `/login`
4. Role (`student`/`teacher`) is on the user object and drives route/component rendering

### Student Onboarding → AI Curriculum
On first login, students complete `Onboarding.jsx` (field, level, goals, learning style). This calls `POST /courses/generate-path`, which invokes `ai-service.js → callOpenRouter()` to generate a structured `currentPath` stored on `StudentProfile`. The `RoadmapTree` component renders this path.

### Backend Route Map
| Prefix | File | Purpose |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Register, login, OTP, password reset |
| `/api/courses` | `routes/courses.js` | CRUD, enrollment, quiz submit, path generation |
| `/api/assessments` | `routes/assessments.js` | Formal assessments |
| `/api/doubts` | `routes/doubts.js` | Student Q&A |
| `/api/gamification` | `routes/gamification.js` | Points, badges, streaks |
| `/api/ai-assistant` | `routes/ai-assistant.js` | AI doubt responses |
| `/api/upload` | `routes/upload.js` | File uploads (Multer) |
| `/api/analytics` | `routes/analytics.js` | Teacher analytics views |
| `/api/rag` | `routes/rag.js` | Document ingestion + AI question generation |

### Key Services (`backend/services/`)
- `ai-service.js` — `callOpenRouter()`, `generateLearningPath()`, `generateTopicQuiz()`
- `questionGenerationService.js` — RAG-based question bank generation with Bloom's taxonomy levels
- `analyticsService.js` — `classOverview()`, `atRiskStudents()`, `studentDeepDive()`, `topicAnalysis()`
- `ingestionService.js` — parse PDF/DOCX/PPTX with pdf-parse/mammoth/officeparser, chunk for RAG
- `retrievalService.js` — chunk retrieval for RAG context
- `email-service.js` — Gmail OTP delivery

### Core Data Models (`backend/models/`)
- **User** — auth fields, role, OTP state
- **Course** — modules → topics → resources hierarchy; each topic has `teacherStatus` and resources with completion state
- **Progress** — per-student/course: completedTopics, completedResources, quizHistory (with Bloom's level), dailyActivity log, riskFlag (`on_track`/`at_risk`/`critical`/`inactive`)
- **StudentProfile** — onboarding data, gamification (points/streak/badges), AI-generated `currentPath`
- **GeneratedQuestion** — AI questions with Bloom's level, question type, approval flag
- **ResourceChunk** — document chunks from RAG ingestion

### Risk Assessment
`Progress.computeRiskFlag(totalTopics)` calculates risk on-demand:
- `inactive`: no activity in 14+ days
- `critical`: no activity in 7+ days OR failing majority of quizzes
- `at_risk`: falling behind schedule OR low scores on multiple topics
- `on_track`: otherwise

### Environment Variables
Backend requires `.env` in `backend/`:
- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — token signing key
- `OPENROUTER_API_KEY` — AI provider key
- `AI_MODEL` — defaults to `qwen/qwen-2.5-7b-instruct`
- `EMAIL_USER` / `EMAIL_PASSWORD` — Gmail credentials for OTP
- `ENABLE_EMAIL_VERIFICATION` — set `false` to skip OTP in dev
