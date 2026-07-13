# Library Management System with AI Assistant

A full-stack library management system featuring role-based access control (Admin/Member), book catalog management, borrowing workflows, and a conversational AI assistant powered by Google Gemini.

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React + TypeScript + Vite           |
| Backend    | FastAPI (Python 3.12/3.14)          |
| Database   | PostgreSQL 16 (async via asyncpg)   |
| AI         | Google Gemini (function calling)    |
| Auth       | JWT (PyJWT + bcrypt)                |
| Deployment | Docker + Docker Compose             |

## Project Structure

```
├── backend/                  # FastAPI application
│   ├── main.py               # App entry point
│   ├── config.py             # Settings from .env
│   ├── schemas.py            # Pydantic request/response models
│   ├── db/
│   │   ├── session.py        # Async SQLAlchemy engine & session
│   │   └── models.py         # ORM models (User, Book, Loan)
│   ├── routes/
│   │   ├── auth.py           # Signup, login, /me
│   │   ├── books.py          # Book CRUD + search
│   │   ├── loans.py          # Borrow, return, oversight
│   │   └── chat.py           # AI assistant endpoint
│   └── services/
│       ├── auth_service.py   # JWT, password hashing, guards
│       ├── book_service.py   # Catalog business logic
│       ├── loan_service.py   # Borrowing business logic
│       └── chat_service.py   # Gemini function-calling agent
├── frontend/                 # React + Vite SPA
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── pages/            # Route-level pages
│       ├── store/            # Zustand state management
│       ├── services/         # API client layer
│       └── App.tsx           # Root component + routing
├── tests/                    # pytest async test suite
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Local dev orchestration
├── requirements.txt          # Python dependencies
└── .env.example              # Environment variable template
```

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Google Gemini API key
- Docker (for PostgreSQL container)

### Setup

```bash
# 1. Clone and navigate
git clone <repo-url>
cd Presidio-Capstone

# 2. Create environment file
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and database secrets

# 3. Start Database
docker compose up postgres -d

# 4. Backend Setup & Startup
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn backend.main:app --reload

# 5. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Docker (Run Full Stack)

```bash
docker compose up --build
```

## Key Design Decisions

- **Async PostgreSQL** — Shifted from SQLite to Dockerized PostgreSQL 16 (via `asyncpg`) to ensure production parity with cloud hosting (e.g. Azure DB for PostgreSQL) and to prevent any database write locking.
- **Service Layer Pattern** — Isolated business logic into dedicated services (`auth_service`, `book_service`, `loan_service`), exposing pure Python interfaces that routes call.
- **JWT Storage Location (HttpOnly Cookies vs. localStorage)**:
  - **Decision**: The application uses **HttpOnly Cookies** as the primary storage location for JWT access tokens.
  - **Trade-offs & Rationale**:
    - *Security (XSS prevention)*: Storing tokens in `localStorage` makes them accessible to any JavaScript running on the page. In the event of a Cross-Site Scripting (XSS) vulnerability, an attacker can extract the token. `HttpOnly` cookies are inaccessible to client-side scripts, protecting the session token from theft.
    - *CSRF Mitigation*: Cookies are vulnerable to Cross-Site Request Forgery (CSRF). To mitigate this, the application sets the `SameSite=Lax` flag and enforces secure headers. Furthermore, the backend allows fallback to standard `Authorization` headers for API/testing client flexibility.
- **Atomic Availability Management** — Handled concurrent stock adjustments atomically in the database layer using SQL-level updates with a conditional clause (`available_copies > 0`), ensuring thread-safe concurrency without expensive table locks.
- **Gemini Function Calling** — The AI assistant uses structured tool declarations so it can search, borrow, and return books on behalf of the user with confirmation gates.

## License

MIT
