# avalanche-metrics

Minimal Express + TypeScript project to serve basic metrics endpoints.

## What this project contains

- TypeScript entrypoint: `app.ts`
- Routes: `routes/index.ts` (provides GET /hello)
- Build output: `dist/` (after `npm run build`)

## Prerequisites

- Node.js >= 18 (recommended)
- npm

## Install

Install dependencies:

```bash
npm install
```

## Development

Run the server in development mode with automatic restart (uses `ts-node-dev`):

```bash
npm run dev
```

This runs `app.ts` directly and reloads on changes.

## Build & Start (production)

Compile TypeScript to `dist/` and run the compiled app:

```bash
npm run build
npm start
```

Set the port with the `PORT` environment variable (default 3000):

```bash
PORT=4000 npm run dev
# or after build
PORT=4000 npm start
```

## Endpoints

- GET /hello — returns JSON `{ "message": "Hello World" }`

Example:

```bash
curl http://localhost:3000/hello
# { "message": "Hello World" }
```

## Notes

- Dev dependencies were added for TypeScript and runtime tooling (`typescript`, `ts-node-dev`, `@types/*`).
- After `npm install` you might see audit warnings from transitive dependencies. I can help upgrade or pin safe fixes if you want.

## Next steps (optional)
- Move source into `src/` and adjust `tsconfig.json`.
- Add linting (ESLint) and basic unit tests (Jest).


## 🔐 Environment Variables

This project requires several environment variables to be configured in order to interact with external services and the database. Below is a description of each variable and where it comes from.

### **`GITHUB_API_KEY`**

Used to authenticate requests to the GitHub API.
This key allows the application to access GitHub endpoints that require authorization, such as reading repository data, creating resources, or interacting with GitHub Apps.

**Where to get it:**
You can generate a classic personal access token or a fine-grained token directly from your GitHub account:
**GitHub → Settings → Developer settings → Personal access tokens**

---

### **`GITHUB_APP_ID`**

The unique identifier of your GitHub App.
This ID is required when the application interacts with GitHub on behalf of a GitHub App (e.g., installing it, generating tokens, reading installation information).

**Where to get it:**
From your GitHub App settings:
**GitHub → Settings → Developer settings → GitHub Apps → Your App → App ID**

---

### **`NEON_CONNECTION_STRING`**

The connection string for your Neon PostgreSQL database.
This is used by the application to connect to the database and run queries.

**Where to get it:**
Inside your Neon project dashboard:
**Neon → Project → Connection Details → Connection string**

It usually looks like:

```
postgresql://user:password@host.neon.tech/database?sslmode=require
```

---

### **`MASTER_API_KEY`**

An internal key used by the application to authorize sensitive operations.
This key is not tied to any third-party service. Instead, it acts as an internal secret that the backend uses to validate privileged requests (e.g., admin actions, secure automation tasks, or internal endpoints).

**Where to get it:**
You generate it yourself.
Recommended: create a long random string and store it in your `.env` file.

Example:

```
MASTER_API_KEY="a_long_random_secret_key"
```

---

Si quieres, puedo agregarte un ejemplo de archivo `.env.example` para complementar tu README.

