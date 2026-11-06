# QA Pulse API

A RESTful backend for managing software QA projects and test cases, built for the SCTP Datacentric Development assessment. It uses **Node.js**, **Express**, **MongoDB Atlas**, **JWT authentication**, and **Google Gemini** for natural-language queries and AI-generated test data.

## Features

- Create, retrieve, search, update, and delete projects and test cases.
- Reference a project from each test case using MongoDB `ObjectId` (`test_cases.projectId` → `projects._id`).
- Prevent deletion of projects that still have linked test cases (HTTP 409).
- Register users with bcrypt-hashed passwords, log in to obtain a JWT, and access a protected profile endpoint.
- Use Gemini to translate a natural-language question into a validated MongoDB filter.
- Generate structured JSON test cases with Gemini, or generate and insert three mock test cases into MongoDB.
- Validate required request fields and return appropriate HTTP error codes.

## Technology stack

- Node.js and Express
- MongoDB Atlas and the MongoDB Node.js driver
- Google Gemini (`@google/genai`; model: `gemini-3.1-flash-lite`)
- `bcrypt`, `jsonwebtoken`, `dotenv`
- `nodemon` for development
- ARC (Advanced REST Client) for API testing
- GitHub Codespaces for development and a forwarded API port

## Setup

### 1. Install dependencies

In a cloned copy of the repository, run:

```bash
npm install
```

For a new project initialized from scratch, the original setup commands were:

```bash
npm init -y
npm install express mongodb dotenv
npm install bcrypt jsonwebtoken
npm install @google/genai
npm install --save-dev nodemon
```

### 2. Configure environment variables

Create a `.env` file in the project root. **Do not commit `.env` to GitHub.**

```dotenv
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_long_random_jwt_secret
PORT=3000
```

To generate a random value for `JWT_SECRET`:

```bash
openssl rand -hex 32
```

The MongoDB database used by the application is `qa_pulse`.

### 3. Run the server

```bash
npm start
```

Or, for automatic restarts while editing:

```bash
npm run dev
```

The default local address is `http://localhost:3000`. In GitHub Codespaces, forward port **3000** and use the forwarded HTTPS URL as the API base URL. Codespaces URLs may change when the environment changes; do not assume an old URL remains active.

Check that the server is running:

```http
GET /
```

Expected JSON: `{"message":"QA Pulse API is running"}`.

## Database structure

### `projects`

| Field | Description |
| --- | --- |
| `_id` | MongoDB-generated `ObjectId` |
| `name` | Project name |
| `description` | Project description |
| `status` | Project status |
| `createdAt` | Creation timestamp |

### `test_cases`

| Field | Description |
| --- | --- |
| `_id` | MongoDB-generated `ObjectId` |
| `title` | Test case title |
| `description` | Testing scenario or expected behaviour |
| `status` | Test execution status, e.g. `Not Run` |
| `priority` | Test priority, e.g. `Low`, `Medium`, `High` |
| `projectId` | `ObjectId` reference to `projects._id` |

A test case cannot be created with a nonexistent project ID. A project with linked test cases cannot be deleted until those test cases are removed.

### `users`

Stores `email`, bcrypt-hashed `password`, and `createdAt`. Passwords are never returned by the login endpoint.

## API endpoints

Replace `{BASE_URL}` with `http://localhost:3000` or the current Codespaces forwarded URL.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/` | API health check |
| GET | `/projects` | List projects |
| GET | `/projects/search?term=QA` | Search project names (case-insensitive) |
| POST | `/projects` | Create a project |
| PUT | `/projects/:id` | Update a project |
| DELETE | `/projects/:id` | Delete a project if no test cases reference it |
| GET | `/test-cases` | List test cases |
| GET | `/test-cases/search?term=Login` | Search test case titles (case-insensitive) |
| POST | `/test-cases` | Create a test case linked to a project |
| PUT | `/test-cases/:id` | Update a test case |
| DELETE | `/test-cases/:id` | Delete a test case |
| POST | `/signup` | Register a user with a hashed password |
| POST | `/login` | Authenticate and receive a JWT |
| GET | `/profile` | Protected route requiring a valid JWT |
| GET | `/gemini/test` | Check Gemini connection |
| POST | `/gemini/query` | Convert a question into a validated MongoDB query |
| POST | `/gemini/generate-test-case` | Generate one structured JSON test case (not saved) |
| POST | `/gemini/generate-mock-data` | Generate and save three mock test cases |

## Example requests in ARC

Select **Raw input → JSON** for POST/PUT requests and send the header `Content-Type: application/json`.

### Create a project

`POST /projects`

```json
{
  "name": "QA Pulse Web Application",
  "description": "Web application quality assurance project",
  "status": "Active"
}
```

A successful request returns HTTP **201 Created** with the inserted project ID.

### Create a test case

`POST /test-cases`

```json
{
  "title": "Verify User Login",
  "description": "Verify that a user can log in with valid credentials",
  "status": "Not Run",
  "priority": "High",
  "projectId": "REPLACE_WITH_EXISTING_PROJECT_ID"
}
```

A successful request returns HTTP **201 Created**. `projectId` must identify an existing project.

### Update a test case

`PUT /test-cases/REPLACE_WITH_TEST_CASE_ID`

```json
{
  "title": "Verify User Login",
  "description": "Verify that valid credentials allow access",
  "status": "Passed",
  "priority": "High"
}
```

The route updates these four fields; it does not change the linked project.

### Register and log in

`POST /signup`

```json
{
  "email": "newtester@example.com",
  "password": "ReplaceWithAStrongPassword123!"
}
```

`POST /login` uses the same email/password structure and returns a JWT on successful authentication.

For `GET /profile`, add the header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

A missing, invalid, or expired token returns HTTP **401 Unauthorized**. JWTs expire after one hour.

### Natural-language MongoDB query

`POST /gemini/query`

```json
{
  "question": "Show me high priority test cases that have not been run"
}
```

Gemini returns a JSON filter using only the allowed `status` and `priority` fields. The API validates this filter before querying `test_cases`, then returns the question, filter, result count, and matching records.

### Generate one structured test case

`POST /gemini/generate-test-case`

```json
{
  "requirement": "Verify that an incorrect password is rejected during login"
}
```

Returns one generated JSON object containing `title`, `description`, `status`, and `priority`. **This endpoint does not save the result to MongoDB.**

### Generate and save AI mock data

`POST /gemini/generate-mock-data`

```json
{
  "projectId": "REPLACE_WITH_EXISTING_PROJECT_ID",
  "requirement": "Generate QA test cases for a web application login feature, including successful login, incorrect password, and empty required fields."
}
```

The API checks the project, asks Gemini for exactly three distinct test cases, validates the JSON, checks for duplicate titles, and inserts the records into MongoDB with the project relationship. A successful request returns HTTP **201 Created**, `insertedCount: 3`, the inserted IDs, and the generated records. **Do not repeatedly send this request just to view results; use `GET /test-cases` instead.**

## HTTP responses and validation

| Status | Meaning / example |
| --- | --- |
| 200 OK | Successful GET/PUT/DELETE, login, or non-saving Gemini request |
| 201 Created | Project, test case, user, or AI mock records inserted |
| 400 Bad Request | Missing required fields, invalid ID, or missing search term |
| 401 Unauthorized | Invalid credentials or missing/invalid/expired JWT |
| 404 Not Found | Requested project or test case does not exist |
| 409 Conflict | Duplicate user email, linked project deletion, or generated duplicate titles |
| 422 Unprocessable Entity | Gemini output fails validation |
| 500 Internal Server Error | Unexpected server, database, or Gemini failure |

## Assessment demonstration flow

1. Show MongoDB Atlas collections `projects`, `test_cases`, and `users` (do not expose password hashes or credentials unnecessarily).
2. Use ARC to demonstrate project and test case CRUD, list, and search endpoints.
3. Show a test case's `projectId` referencing an existing project's `_id`.
4. Demonstrate signup, login/JWT issuance, and the protected `/profile` route.
5. Demonstrate `/gemini/query` and `/gemini/generate-test-case`.
6. Demonstrate `/gemini/generate-mock-data` returning `201 Created` and `insertedCount: 3`, followed by `GET /test-cases` showing the saved records.
7. Show the GitHub source repository and Codespaces forwarded API port.

## Source repository

GitHub: https://github.com/rock-mgr/qa-pulse-api

## Security notes

- Keep `.env`, MongoDB credentials, Gemini API keys, and JWT signing secrets out of source control.
- Use sample credentials only in documentation.
- Generated mock data is inserted into the real database; use a dedicated test project or avoid unnecessary repeated requests.
