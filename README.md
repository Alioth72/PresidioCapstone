# Library Management System with AI Assistant

A full-stack library management system featuring role-based access control (Admin/Member), book catalog management, borrowing workflows, and a conversational AI assistant powered by Google Gemini.

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React + TypeScript + Vite           |
| Backend    | FastAPI (Python 3.12)               |
| Database   | SQLite (async via SQLAlchemy)       |
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

### Setup

```bash
# 1. Clone and navigate
git clone <repo-url>
cd Presidio-Capstone

# 2. Create environment file
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and secrets

# 3. Backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn backend.main:app --reload

# 4. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker compose up --build
```

## Key Design Decisions

- **Async SQLite** — lightweight, zero-config database perfect for the project scope; async driver prevents blocking the event loop.
- **Gemini Function Calling** — the AI assistant uses structured tool declarations so it can search, borrow, and return books on behalf of the user with confirmation gates.
- **Service Layer Pattern** — business logic is separated from routes for testability and reuse (routes → services → DB).
- **JWT with Role Guards** — token-based auth with FastAPI dependencies that enforce admin/member boundaries at the endpoint level.

## License

MIT
