# GoPilot

GoPilot is an AI assistant for your Google Workspace. You connect Gmail, Google Calendar, Google Meet, Google Sheets, Google Drive and Google Forms, and then either:

- **Chat**: ask in plain English ("send what's on my calendar on Monday to the person I last emailed 'hi'"), and a team of AI agents does the work across your apps, or
- **Build workflows**: put agents on a visual canvas in a fixed order (with checks and human approvals between steps), save the workflow, and run it again whenever you want, from the canvas or from chat. You can also share workflows on the **Hub** and copy other people's.

It is built with the [OpenAI Agents SDK](https://github.com/openai/openai-agents-js), Express + MongoDB + Redis + Qdrant on the backend, and React + Vite + React Flow on the frontend.

---

## Table of contents

1. [How it works](#how-it-works)
   - [Agent orchestration (chat)](#agent-orchestration-chat)
   - [Workflows](#workflows)
   - [Connecting Google apps](#connecting-google-apps)
   - [Memory and privacy](#memory-and-privacy)
2. [Project structure](#project-structure)
3. [Getting your keys](#getting-your-keys)
   - [Google Cloud: enable APIs, consent screen, OAuth client](#1-google-cloud-oauth-client-and-apis)
   - [OpenAI API key](#2-openai-api-key)
   - [GitHub OAuth app (optional)](#3-github-oauth-app-optional)
   - [JWT secret and encryption key](#4-jwt-secret-and-encryption-key)
4. [Running locally](#running-locally)
5. [Environment variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## How it works

```
Browser (React, :5173)
   │  REST + Server-Sent Events, cookies for auth
   ▼
Express API (:5000)
   ├── Orchestrator agent ──► service agents (Gmail, Calendar, Meet, Sheets, Drive, Forms)
   │                               └── specialist agents ──► tools ──► Google APIs
   ├── Workflow engine (runs saved workflows step by step)
   ├── MongoDB   users, chats, connected apps, workflows, workflow runs
   ├── Redis     socket bookkeeping
   └── Qdrant    chat memory (vector search over earlier conversations)
```

### Agent orchestration (chat)

Agents are arranged in three levels:

```
                         orchestrator-agent (gpt-4.1)
                                   │  calls service agents as tools
     ┌──────────┬───────────┬──────┴─────┬───────────┬───────────┐
 gmail_agent calendar_agent meet_agent sheets_agent drive_agent forms_agent
     │  (coordinators: route only, hand off to one specialist)
     ├─ gmailReaderAgent    search / list / read
     ├─ gmailWriterAgent    compose / send / reply / forward
     ├─ gmailTrashAgent     trash / archive / spam / labels
     └─ gmailDeleteAgent    permanent delete (only on explicit request)
        ... and the same pattern for every other app
```

1. **Orchestrator** ([backend/main-backend/src/agents/orchestrator.ts](backend/main-backend/src/agents/orchestrator.ts)). It is created per request so its instructions carry today's date and the user's time zone. It splits the request into steps, works out the order and dependencies, and calls the service agents as **tools** (`gmail_agent`, `calendar_agent`, ...). Calls that don't depend on each other run in parallel. Because the service agents are tools and not handoffs, control always returns to the orchestrator, so one request can chain several apps: read the calendar, find an address in Gmail, then send an email.
2. **Coordinators** (one per app). They only route: each is forced to call a tool (`toolChoice: "required"`), so it always hands off to one specialist instead of answering itself.
3. **Specialists** ([backend/main-backend/src/agents/](backend/main-backend/src/agents/)). Each has a small set of tools ([backend/main-backend/src/tools/](backend/main-backend/src/tools/)) that call the Google APIs through wrappers in [backend/main-backend/src/utils/google/](backend/main-backend/src/utils/google/). Splitting readers, writers and deleters keeps destructive actions separate and lets each agent have narrow instructions.

**One chat turn, end to end** ([backend/main-backend/src/controllers/agent.ts](backend/main-backend/src/controllers/agent.ts)):

1. The frontend `POST`s to `/api/v1/agent/chat/:sessionId`.
2. The backend loads the user's Google refresh tokens for every connected app and passes them as the agent **run context**, so every tool can create a Google client for that user.
3. It loads the recent history of the chat and recalls related turns from earlier chats (Qdrant), then runs the orchestrator.
4. The reply is streamed back as **Server-Sent Events**: `step` (a service agent started or finished, shown as progress in the UI), `delta` (the next piece of the answer), `done`, or `error`.
5. Specialists return structured output with `dynamicContent` (emails, events, files, sheets...). These become cards in the chat, and their ids are saved with the reply so follow-ups like "add Ana to that meeting" work.
6. The turn is encrypted and saved to MongoDB and Qdrant, and the first message gets an AI-generated chat title.

The orchestrator also has two per-user tools ([backend/main-backend/src/workflow/chatTools.ts](backend/main-backend/src/workflow/chatTools.ts)), `list_my_workflows` and `run_workflow`, so "run my weekly report workflow for Friday" starts a saved workflow from chat.

### Workflows

A workflow is a graph you draw on the canvas (React Flow). It is saved in MongoDB as `nodes`, `edges` and a list of **input fields**.

**Node types**

| Node | What it does |
|------|--------------|
| **Start** | Entry point. Exactly one per workflow. |
| **Agent** | Runs one specialist agent (e.g. `calendarReaderAgent`) with a task such as `List my events on {{date}}`. `{{key}}` is replaced with the run's input values. The full list of agents is in [backend/main-backend/src/workflow/registry.ts](backend/main-backend/src/workflow/registry.ts). |
| **Checker** | Checks the step before it: it passes if that agent succeeded and, if you wrote a condition ("at least one email was found"), an LLM judges that the condition holds. A failed check stops the run. |
| **Human review (HIL)** | Pauses the run until you approve or reject it. You can add a note that later steps will read. |
| **End** | Finishes the run. |

**Inputs.** Each workflow declares typed inputs (`text`, `number`, `date`, `time`, `email`, `email_list`, `url`, `select`, `yes_no`, and pickers for a spreadsheet, Drive file or folder, form, Gmail label or calendar). They are validated before a run starts.

**How a run executes** ([backend/main-backend/src/workflow/engine.ts](backend/main-backend/src/workflow/engine.ts)):

1. **Plan** ([plan.ts](backend/main-backend/src/workflow/plan.ts)): walk the graph from Start and produce an ordered list of steps. Steps run one after another, so each node may only have one outgoing connection. Loops, missing agents and unconnected nodes are reported as errors or warnings (`GET /api/v1/workflow/:id/check`).
2. A `WorkflowRun` document is created with every step `pending`, and the run continues in the background. The canvas polls the run to show live status.
3. For each **Agent** step, the engine clones the specialist with no handoffs and a strict output schema: `status` (`success`, `failed` or `needs_input`), `summary`, `data` and `error`. The prompt contains the step's task, the run inputs, the review notes, and the `summary`/`data` of every earlier step, which is how results flow from one step to the next.
4. `failed` stops the run at that step and marks the rest `skipped`. `needs_input` pauses the run and shows the agent's question; your answer is passed back to the agent.
5. **Human review** sets the run to `waiting_for_review`. Because all state is in MongoDB, a run can wait as long as needed, even across server restarts, and continues from the same step after you decide (`POST /api/v1/workflow/runs/:runId/review`).
6. On startup, runs that were mid-step when the server stopped are marked failed (`failInterruptedRuns`).

**Generating a workflow with AI.** `POST /api/v1/others/generate-workflow` sends your description to `gpt-4.1` with a structured schema. The model either says the task isn't feasible with the available agents, or returns steps, inputs, checks and review points, which the backend lays out as nodes and edges on the canvas.

**Hub.** You can publish a workflow to the Hub (`/api/v1/hub/upload`), browse what others have published, and copy one into your own workflows (`/api/v1/hub/copy/:workflowId`).

### Connecting Google apps

GoPilot uses one Google OAuth client for two separate things:

1. **Sign in** (`/api/v1/auth/google/oauth-init`) asks only for your profile and email. It creates your account and sets `accessToken`/`refreshToken` cookies (JWT).
2. **Connect an app** (Settings > Connected apps, `/api/v1/connection/google-service-init`). Each app is a `ConnectionDefinition` in MongoDB with the list of scopes it can ask for (seeded by `npm run seed:connections`). You choose permissions, Google asks for consent with those scopes, and the callback stores a `ServiceConnection` with the granted scopes and a **refresh token** for that app. Agents use that refresh token to call the Google API.

Both flows come back to the same redirect URI, `/api/v1/auth/google/callback`. The OAuth `state` parameter tells them apart (`auth` for sign in, the service name for app connections).

### Memory and privacy

- Chat messages, workflow inputs and step results are encrypted with AES-256-GCM (`ENCRYPTION_KEY`) before they are written to MongoDB or Qdrant.
- Every chat turn is embedded with `text-embedding-3-small` and stored in the Qdrant collection `chat_memory`, filtered by user. Related turns from earlier chats are recalled and given to the orchestrator as context. If Qdrant is down, chat history falls back to MongoDB.
- Agent runs use `store: false` and tracing is disabled, so OpenAI keeps no stored responses or traces of your emails and files ([runConfig.ts](backend/main-backend/src/agents/runConfig.ts)).

---

## Project structure

```
.
├── backend/
│   ├── docker/
│   │   └── docker-compose.yml        # Redis, MongoDB, Qdrant, RabbitMQ for local dev
│   └── main-backend/                 # Express + TypeScript API
│       ├── .env.example              # copy to .env and fill in
│       └── src/
│           ├── index.ts              # starts Redis, Socket.IO, MongoDB, Qdrant, then the HTTP server
│           ├── app.ts                # Express app and route mounting (/api/v1/...)
│           ├── agents/               # orchestrator, per-app coordinators and specialist agents
│           ├── tools/                # agent tools (one file per Google app)
│           ├── utils/google/         # thin wrappers over the googleapis client
│           ├── workflow/             # registry of runnable agents, planner, run engine, chat tools
│           ├── controllers/          # route handlers (auth, chat, workflows, hub, pickers, ...)
│           ├── routes/               # Express routers
│           ├── models/               # Mongoose models: Auth, chat, connect, workflow
│           ├── services/             # memory (Qdrant), service tokens, chat titles, db helpers
│           ├── config/               # env, MongoDB, Redis, Qdrant clients
│           ├── middleware/           # auth (JWT cookie), validation, error handling
│           ├── sockets/              # Socket.IO (cookie-authenticated)
│           ├── scripts/              # seedConnections.ts, migrateChatsToQdrant.ts
│           └── public/icons/         # app icons served at /public/icons
└── frontend/                         # React 19 + Vite + Tailwind + shadcn/ui
    ├── .env.example
    └── src/
        ├── pages/
        │   ├── public/               # landing page, login / sign up
        │   └── private/
        │       ├── automate/         # chat (New, SessionChat), workflows (WorkFlow, Flow canvas), Hub
        │       └── setting/          # connected apps, general settings
        ├── components/
        │   ├── chat/                 # input, messages, streaming reply, workflow picker
        │   ├── workflow/             # canvas nodes, inspector, run dialog/panel, AI generator, Hub upload
        │   ├── responses/            # cards for emails, events, files, ...
        │   └── settings/             # integration cards and permission drawer
        ├── lib/                      # API helpers: chat, SSE stream, workflow, hub, services
        ├── store/                    # Redux Toolkit (auth, sessions)
        └── utils/axiosInstance.ts    # API base URL (VITE_API_ORIGIN)
```

---

## Getting your keys

You need: a Google OAuth client (with the Google APIs enabled), an OpenAI API key, and two random secrets. GitHub login is optional.

### 1. Google Cloud: OAuth client and APIs

#### a. Create a project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project picker at the top, then **New project**. Name it (e.g. `gopilot-dev`) and click **Create**. Make sure it's selected.

#### b. Enable the APIs

Go to **APIs & Services > Library**, search for each of these and click **Enable**:

| API | Used for |
|-----|----------|
| [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) | Read, send, label, trash and delete email |
| [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) | Events, and Meet links (Meet meetings are created as Calendar events with `conferenceData`) |
| [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com) | Read, write and format spreadsheets |
| [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com) | Files and folders, sharing; also used to list, copy and trash forms |
| [Google Forms API](https://console.cloud.google.com/apis/library/forms.googleapis.com) | Create and edit forms, read responses |
| [Google Meet REST API](https://console.cloud.google.com/apis/library/meet.googleapis.com) | Optional: the Meet app asks for the `meetings.space.*` scopes |

Sign in only needs the `userinfo.profile` and `userinfo.email` scopes; you don't need to enable an extra API for them.

#### c. Configure the OAuth consent screen

1. Go to **APIs & Services > OAuth consent screen** (in newer consoles: **Google Auth Platform > Branding / Audience / Data access**).
2. **User type: External**. Fill in the app name (`GoPilot`), the support email and the developer contact email.
3. **Scopes / Data access**: add the scopes the app asks for. The full list is in [seedConnections.ts](backend/main-backend/src/scripts/seedConnections.ts):

   ```
   userinfo.profile, userinfo.email
   gmail.readonly, gmail.send, gmail.compose, gmail.modify
   calendar.readonly, calendar.events, calendar
   meetings.space.created, meetings.space.readonly
   spreadsheets.readonly, spreadsheets
   drive.readonly, drive.file, drive
   forms.body.readonly, forms.body, forms.responses.readonly
   ```

   (Each is prefixed with `https://www.googleapis.com/auth/`.)
4. **Test users / Audience**: while the app is in **Testing**, only the Google accounts you add here can sign in. Add your own account and anyone else who will try it.

> Gmail and full Drive scopes are *restricted* scopes. That's fine for development with test users. Making the app available to everyone requires Google's verification (and a security assessment for restricted scopes). In Testing mode, refresh tokens expire after 7 days, so you may need to reconnect apps.

#### d. Create the OAuth client ID and secret

1. Go to **APIs & Services > Credentials > Create credentials > OAuth client ID**.
2. **Application type: Web application**.
3. **Authorized JavaScript origins**: `http://localhost:5173`
4. **Authorized redirect URIs**: `http://localhost:5000/api/v1/auth/google/callback`
   This must match `GOOGLE_REDIRECT_URI` exactly (protocol, port, path, no trailing slash).
5. Click **Create** and copy the **Client ID** and **Client secret** into `backend/main-backend/.env`:

   ```env
   GOOGLE_CLIENT_ID=1234567890-abc...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback
   ```

### 2. OpenAI API key

All agents (`gpt-4.1` for the orchestrator and workflow generator, `gpt-4o-mini` for checkers and chat titles) and the memory embeddings (`text-embedding-3-small`) use OpenAI.

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys) and click **Create new secret key**.
2. Make sure the account has billing set up, and access to the models above.
3. Put it in `.env` as `OPENAI_API_KEY=sk-...`. The OpenAI SDK reads this variable directly.

### 3. GitHub OAuth app (optional)

Only needed for "Sign in with GitHub".

1. Go to **GitHub > Settings > Developer settings > OAuth Apps > New OAuth App** ([direct link](https://github.com/settings/applications/new)).
2. **Homepage URL**: `http://localhost:5173`
3. **Authorization callback URL**: `http://localhost:5000/api/v1/auth/github/callback`
4. Register it, click **Generate a new client secret**, and set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

### 4. JWT secret and encryption key

```bash
openssl rand -hex 32   # use for JWT_SECRET
openssl rand -hex 32   # use for ENCRYPTION_KEY (must be exactly 64 hex characters)
```

Keep `ENCRYPTION_KEY` the same once you have data: changing it makes existing chats, workflow runs and memories unreadable.

---

## Running locally

**Requirements:** Node.js 20+, npm, Docker (Docker Desktop or Docker Engine with Compose).

```bash
git clone https://github.com/vishunstopabel/Gopilot.git
cd Gopilot
```

**1. Start the databases**

```bash
cd backend/docker
docker compose up -d
```

This starts Redis on `6380` (RedisInsight on `8002`), MongoDB on `27018`, Qdrant on `6333`, and RabbitMQ on `5672` (management UI on `15672`). The RabbitMQ user/password in the compose file are local development defaults; change them if you expose the container.

**2. Configure and start the backend**

```bash
cd backend/main-backend
cp .env.example .env          # then fill in the keys from the section above
npm install
npm run seed:connections      # adds Gmail, Calendar, Meet, Sheets, Drive, Forms to "Connected apps"
npm run dev                   # http://localhost:5000  (health check: /api/v1/health)
```

`seed:connections` is safe to run again; it only adds missing apps and permissions.

**3. Start the frontend**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

**4. Use it**

1. Open http://localhost:5173 and sign in with Google (with an account listed as a test user).
2. Go to **Settings > Connected apps**, open an app, choose permissions and connect it.
3. Start a chat, or open **Workflows** to build one on the canvas or generate one from a description.

---

## Environment variables

### `backend/main-backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | yes | API port. The frontend expects `5000`. |
| `GOOGLE_CLIENT_ID` | yes | OAuth client ID from Google Cloud. |
| `GOOGLE_CLIENT_SECRET` | yes | OAuth client secret from Google Cloud. |
| `GOOGLE_REDIRECT_URI` | yes | `http://localhost:5000/api/v1/auth/google/callback`. Must also be listed in the OAuth client. |
| `OPENAI_API_KEY` | yes | OpenAI key for agents, workflow generation and embeddings. |
| `JWT_SECRET` | yes | Signs session cookies. |
| `ENCRYPTION_KEY` | yes | 64 hex characters, encrypts stored chats and workflow data. |
| `MONGODB_URL` | yes | e.g. `mongodb://127.0.0.1:27018/gopilot` with the compose file. |
| `QDRANT_URL` | no | Defaults to `http://127.0.0.1:6333`. |
| `QDRANT_API_KEY` | no | Only for a secured or cloud Qdrant. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | no | For GitHub sign in. |

Redis is currently fixed to `127.0.0.1:6380` in [config/redis.ts](backend/main-backend/src/config/redis.ts).

### `frontend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_ORIGIN` | no | Backend URL. Defaults to `http://localhost:5000`. |

> The frontend URL `http://localhost:5173` is hardcoded in the backend (CORS in [utils/helpers.ts](backend/main-backend/src/utils/helpers.ts), redirects and cookie domain in [controllers/auth.ts](backend/main-backend/src/controllers/auth.ts)). Change those if you serve the frontend elsewhere.

Never commit your `.env` files: they're listed in `.gitignore`. Only the `.env.example` files belong in the repository.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `redirect_uri_mismatch` from Google | The redirect URI in the OAuth client must be exactly `GOOGLE_REDIRECT_URI`. |
| `access_denied` / "app has not completed verification" | Add your Google account as a **test user** on the consent screen. |
| A tool says "<API> has not been used in project ... or it is disabled" | Enable that API in the Library (step 1b) and wait a minute. |
| "Connected apps" is empty | Run `npm run seed:connections`. |
| Connecting an app redirects with `token_exchange_failed` | Google didn't return a refresh token. Remove GoPilot at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) and connect again. |
| Connected apps stop working after a week | Testing-mode refresh tokens expire after 7 days. Reconnect the app. |
| `Failed to decrypt message` | `ENCRYPTION_KEY` changed since the data was written. |
| Server won't start, MongoDB/Redis/Qdrant connection errors | Make sure Docker is running and `docker compose up -d` succeeded. |
