# Code Explanation: Backend Architecture & Feature Guide

This document is a comprehensive, file-by-file, module-by-module reference guide explaining how every feature is designed, structured, and implemented in the **Bibliotech** FastAPI backend application.

---

## 1. Overview of Folder Structure

```text
backend/
├── main.py             # FastAPI entrypoint, middlewares, exceptions, routing
├── config.py           # Configuration environment variables (Pydantic Settings)
├── schemas.py          # Pydantic schema validation models
├── db/                 # Database layer
│   ├── session.py      # SQLAlchemy connection, pooling, session factory
│   ├── models.py       # SQLAlchemy ORM models, property helpers, indices
│   ├── utils.py        # Database concurrency helpers (atomic operations)
│   └── seed.py         # Seed data script
├── routes/             # REST controllers
│   ├── auth.py         # Sign-in, sign-up, session check, user role updates
│   ├── books.py        # Catalog search, reviews, admin CRUD
│   ├── loans.py        # Borrow, return, admin loan management
│   └── chat.py         # Gemini conversational assistant endpoints
└── services/           # Business logic layer
    ├── auth_service.py # Bcrypt hashing, JWT generation, route guards
    ├── book_service.py # Catalog query logic, ISBN checks, admin changes
    ├── loan_service.py # Limits checking, transactions, overdue checks
    └── chat_service.py # Gemini OpenAI compatibility wrapper, tool-calling agent
```

---

## 2. Main Entrypoint & Configuration

### A. `backend/main.py`
- **What it does**: Initializes the FastAPI app instance, configures CORS policies, registers request loggers, implements centralized exception mappings, and includes the routing modules.
- **Key Modules & Code Breakdown**:
  1. **Lifespan Context Manager**:
     ```python
     @asynccontextmanager
     async def lifespan(app: FastAPI):
         # Startup logic
         await init_db()
         if settings.APP_ENV == "development":
             await seed()
         yield
         # Shutdown logic
     ```
     Sets up the database connection and runs initial seeding operations. It yields control back to FastAPI to handle incoming connections, running the shutdown logic when the server terminates.
  2. **CORS Configuration**:
     Configured via `CORSMiddleware` (lines 54-60) to allow credentials (`allow_credentials=True`) so browser clients can submit HTTP-Only session cookies across origins.
  3. **Global Request Logging Middleware**:
     Calculates request processing duration using `time.time() - start_time` (lines 65-79) and outputs structured log metrics (HTTP method, endpoint, response status, and processing latency).
  4. **Centralized Exception Handlers**:
     - `HTTPException`: Formats standard FastAPI HTTP errors into a consistent structure: `{"error": {"code": "HTTP_ERROR", "message": detail}}` (lines 83-94).
     - `RequestValidationError`: Formats Pydantic validation errors (invalid query types or missing fields) into a descriptive response shape detailing exactly which field failed rules (lines 97-109).
     - `Exception`: A catch-all handler that logs unhandled 500 runtime exceptions to prevent internal stack traces from leaking to clients (lines 112-124).

---

### B. `backend/config.py`
- **What it does**: Loads settings from the local `.env` file using `pydantic-settings`.
- **Properties**:
  - `APP_ENV`: Defaults to `"development"`.
  - `JWT_SECRET_KEY` & `JWT_ALGORITHM`: Used to sign and verify session tokens.
  - `DATABASE_URL`: Connection string (defaults to local PostgreSQL).
  - `GEMINI_API_KEY` & `GEMINI_MODEL`: Key and model selection (`gemini-2.0-flash`) for the AI assistant.
  - `MAX_ACTIVE_LOANS`: Max active checkouts per member (configured to `5`).

---

## 3. Database Layer

### A. `backend/db/session.py`
- **What it does**: Handles the asynchronous SQLAlchemy database connection.
- **Key Components**:
  1. **Engine Setup**:
     ```python
     engine = create_async_engine(
         settings.DATABASE_URL,
         echo=(settings.APP_ENV == "development"),
         pool_size=5,
         max_overflow=10,
     )
     ```
     Establishes an async engine using the `asyncpg` driver. Allocates 5 persistent connections (`pool_size`) and allows up to 10 additional temporary connections (`max_overflow`) to handle traffic spikes.
  2. **Session Dependency (`get_db`)**:
     An asynchronous generator used as a FastAPI dependency. It yields a session from the session factory, commits the transaction on success, and automatically rolls it back if a route execution fails.

---

### B. `backend/db/models.py`
- **What it does**: Defines SQLAlchemy ORM database models.
- **Key Models**:
  1. **`User`**: Fields for username, email, role (Admin/Member), status, and timestamps.
  2. **`Book`**: Fields for title, author, ISBN, category, copies, and rating properties.
     - **`average_rating`** (Lines 86-93): Computes the average score by loading the related `reviews` relationship: `sum(r.rating for r in self.reviews) / len(self.reviews)`.
     - **`review_count`** (Lines 95-100): Returns the total number of reviews submitted for the book.
  3. **`Loan`**: Links users to books. Tracks borrow dates, due dates, return dates, status, and admin notes.
  4. **`ChatMessage`**: Saves chat logs. Tracks sender role (User/Assistant), message content, and tool actions.
  5. **`Review`**: Links users to books with a rating (1-5) and comment.
- **Index Justifications**:
  - `users.username` & `users.email`: Unique lookup indexes to speed up sign-in verification.
  - `books.title` & `books.author`: Filter indexes to optimize search queries.
  - `loans.user_id`: Index to speed up user loan list queries.
  - `ix_loans_user_active` (Line 135): A composite index on `(user_id, is_active)` to speed up active loan checks when checking borrow limits.

---

### C. `backend/db/utils.py`
- **What it does**: Helper functions that use SQL updates to handle book inventory updates and prevent race conditions.
- **Key Operations**:
  1. **Atomic Decrement (`decrement_availability`)**:
     ```python
     result = await db.execute(
         update(Book)
         .where(Book.id == book_id, Book.available_copies > 0)
         .values(available_copies=Book.available_copies - 1)
     )
     return result.rowcount > 0
     ```
     Executes an atomic SQL update statement: `UPDATE books SET available_copies = available_copies - 1 WHERE id = :id AND available_copies > 0`.
     - **Why it matters**: If two users attempt to borrow the last copy of a book at the same time, database locks ensure only one transaction can decrement the count. The second update will match 0 rows and return `False`, preventing overselling without needing slow application-level locks.
  2. **Atomic Increment (`increment_availability`)**:
     Increments availability on return: `UPDATE books SET available_copies = available_copies + 1 WHERE id = :id AND available_copies < total_copies`. Prevents the count from exceeding the total number of copies in stock.

---

### D. `backend/db/seed.py`
Populates the database with default data (admin and member test accounts, 100 books from various genres, sample loan records, and book reviews) if the tables are empty.

---

## 4. REST Routing Controllers

### A. `backend/routes/auth.py`
- **`/signup`** (Post): Checks for username/email duplicates, hashes passwords, and saves new user records.
- **`/login`** (Post): Validates credentials. On success, generates a JWT token and writes it to an HttpOnly session cookie:
  ```python
  response.set_cookie(
      key="access_token",
      value=token,
      httponly=True,   # Hides cookie from JavaScript to prevent XSS attacks
      max_age=settings.JWT_EXPIRATION_MINUTES * 60,
      samesite="lax",  # Prevents cross-site request forgery (CSRF)
      secure=(settings.APP_ENV == "production"), # Send only over HTTPS in production
  )
  ```
- **`/logout`** (Post): Instructs the browser to delete the session cookie.
- **`/me`** (Get): Returns profile info for the currently logged-in user.
- **`/users`** & **`/users/{user_id}/role`** (Admin-only): Lists all registered accounts and handles role promotions or demotions.

---

### B. `backend/routes/books.py`
- **`/`** (Get): Returns a paginated list of books. Supports filtering by search terms or category, and sorting.
- **`/{book_id}`** (Get): Returns details for a single book.
- **`/`** (Post), **`/{book_id}`** (Put), & **`/{book_id}`** (Delete) (Admin-only): Handles catalog mutations. Delete operations are blocked if a book has active loans.
- **`/{book_id}/reviews`** (Get/Post): Handles book reviews. Checks for duplicates to ensure users can only review a book once.

---

### C. `backend/routes/loans.py`
- **`/borrow`** (Post): Processes checkouts for the logged-in member.
- **`/{loan_id}/return`** (Post): Closes a loan, records the return timestamp, and updates book availability. Members can only return their own loans; admins can return any loan.
- **`/my`** (Get) & **`/all`** (Admin-only): Lists active and historical loans.
- **`/overdue`** (Get): Returns active loans past their due date. Admins see all overdue loans, while members only see their own.
- **`/{loan_id}/close`** (Admin-only): Handles manual loan closures. If marked as `"lost"` or `"damaged"`, it decrements the book's total copy count to adjust the catalog inventory.

---

### D. `backend/routes/chat.py`
Exposes AI assistant endpoints for members to process query messages, retrieve chat histories, or clear historical conversation logs.

---

## 5. Business Logic Services

### A. `backend/services/auth_service.py`
- **`hash_password(password)`**: Hashes a password using Bcrypt with a randomly generated salt.
- **`verify_password(plain, hashed)`**: Safely compares a plain-text password against a Bcrypt hash.
- **`create_access_token(...)`**: Signs a JWT containing the user identity, role, and expiration timestamp.
- **`get_current_user(...)`**: Reusable dependency. Extracts the JWT from either the HTTP `Authorization` header or the session cookie, decodes and validates the signature, and retrieves the active user from the database.
- **`require_role(...)`**: Implements role-based access control (RBAC). Restricts endpoints to users matching required roles (e.g. `require_admin`).

---

### B. `backend/services/book_service.py`
Implements the catalog query engine. Processes paginated searches using SQLAlchemy `ilike` filters, handles sorting, and manages total copy count updates.

---

### C. `backend/services/loan_service.py`
Orchestrates checkouts and returns. Validates active loan limits (`MAX_ACTIVE_LOANS = 5`), decrements availability, creates loan records, and handles returns or manual admin closures.

---

### D. `backend/services/chat_service.py` (Gemini AI Integration)
Implements the conversational assistant using Gemini and tool-calling capabilities.

#### 1. Registered Agent Tools (`TOOLS`)
Defines 5 JSON schemas mapping Python services to the LLM agent:
- `search_catalog`: Runs catalog searches with optional category filters.
- `get_book_details`: Fetches metadata for a specific book ID.
- `borrow_book`: Borrows a book.
- `return_book`: Returns a book.
- `list_my_loans`: Lists the user's active checkouts.

#### 2. Connection Wrapper (`_call_gemini_completions`)
```python
async def _call_gemini_completions(self, messages: list) -> SimpleResponse:
    url = f"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key={settings.GEMINI_API_KEY}"
    payload = {
        "model": settings.GEMINI_MODEL,
        "messages": messages,
        "tools": TOOLS,
        "tool_choice": "auto"
    }
    headers = {"Authorization": f"Bearer {settings.GEMINI_API_KEY}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(url, json=payload, headers=headers)
        # Parse Response and map tool calls
```
Uses HTTP requests to interact with Gemini's OpenAI compatibility endpoint. This allows function calling configurations to use direct API keys without needing heavy SDK dependencies.

#### 3. Agent Execution Loop (`process_message`)
- Fetches the last 20 messages from the database to maintain conversation context.
- Appends the new user query and formats the system instructions.
- Runs an execution loop with a limit of 5 iterations:
  1. Submits the conversation history to the model.
  2. If the model responds with text and no tool calls, it exits the loop.
  3. If the model requests tool calls, the service intercepts them:
     - Parses the requested function name and arguments.
     - Runs the corresponding backend utility (`book_service` or `loan_service`).
     - Appends the tool execution results back to the message history.
  4. Submits the updated history back to the model for the next step.
- Saves the conversation history and the final assistant response to the database.
