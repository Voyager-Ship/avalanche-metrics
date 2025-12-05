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

Aquí tienes la **tabla limpia en Markdown** para pegar directo en tu `README.md`, manteniendo exactamente los valores de tu captura.

---

**TEST_MODE**  
Indica si la aplicación debe ejecutarse en modo de pruebas.  
Cuando está en `true`, se habilitan comportamientos especiales para testing (datos simulados, desactivación de integraciones externas, logs adicionales, etc.).  
Cuando está en `false`, la aplicación opera en modo normal de producción.

---

### **Endpoints**

# 1) Users contributions
curl -X POST "https://avalanche-metrics.vercel.app/users/contributions" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $AVALANCHE_METRICS_API_KEY" \
  -d '{
    "users": ["user1", "user2"],
    "projects": ["project1", "project2"],
    "page": 1
  }'

---

# 2) Users activity
curl -X POST "https://avalanche-metrics.vercel.app/users/activity" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $AVALANCHE_METRICS_API_KEY" \
  -d '{
    "users": ["user1", "user2"],
    "projects": ["project1", "project2"],
    "page": 1
  }'

---

# 3) Chain contracts data
curl -X POST "https://avalanche-metrics.vercel.app/users/contracts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $AVALANCHE_METRICS_API_KEY" \
  -d '{
    "addresses": ["0x0000000000000000000000000000000000000000"],
    "chainId": 43114,
    "page": 1
  }'



# **Github Endpoint – Performance Tests**

| Users   | Events  | Repositories | Time       | Response Size | Notes                                                                     |
| ------- | ------- | ------------ | ---------- | ------------- | ------------------------------------------------------------------------- |
| 1,000   | 4,000   | 400          | 11.8s      | 100MB         |                                                                           |
| 10,000  | 40,000  | 4,000        | 14s, 41.6s | 100MB         | Data saved on database on 14s, failed convertion to json on 41.6s         |
| 100,000 | 400,000 | 40,000       | 40s, 44s   | 100MB         | Data saved on database on 40s, failed convertion to json by memory on 44s |

---

# **Chain Endpoint – Performance Tests**

| Accounts | Contracts | Response Size | Time  | Notes |
| -------- | --------- | ------------- | ----- | ----- |
| 1,000    | 1,000     | 148.4kb       | 3s    |       |
| 10,000   | 10,000    | 1497kb        | 4.92s |       |
| 100,000  | 100,000   | 14MB          | 11s   |       |

---

## Notes

- Dev dependencies were added for TypeScript and runtime tooling (`typescript`, `ts-node-dev`, `@types/*`).
- After `npm install` you might see audit warnings from transitive dependencies. I can help upgrade or pin safe fixes if you want.

## Next steps (optional)
- Move source into `src/` and adjust `tsconfig.json`.
- Add linting (ESLint) and basic unit tests (Jest).


