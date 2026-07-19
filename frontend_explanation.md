# Code Explanation: Frontend Architecture & Feature Guide

This document is a comprehensive, file-by-file, section-by-section reference guide explaining how every feature is designed, structured, and implemented in the **Bibliotech** React frontend application.

---

## 1. Overview of Folder Structure

```text
frontend/
├── package.json          # Node dependencies, build & run scripts
├── tsconfig.json          # TypeScript workspace configuration
├── vite.config.ts        # Vite compiler settings
├── index.html            # Main HTML wrapper (mounts the React app)
└── src/
    ├── main.tsx          # App entrypoint (initializes DOM and QueryClient)
    ├── App.tsx           # Router, route definitions, protected wrappers, toast
    ├── App.css           # Local legacy styles
    ├── index.css         # Main Neo-Brutalist stylesheet and global tokens
    ├── api.ts            # Axios configuration, API client calls, typescript models
    ├── store.ts          # Zustand global store (Auth, theme, and toast)
    ├── components/       # Reusable components
    │   ├── Navbar.tsx
    │   ├── BookCard.tsx
    │   └── ChatAssistant.tsx
    └── pages/            # Page layouts
        ├── LoginPage.tsx
        ├── CatalogPage.tsx
        ├── BookDetailPage.tsx
        └── DashboardPage.tsx
```

---

## 2. Configuration & Build Setup

### A. `package.json`
- **Dependencies**:
  - `react` & `react-dom` (v19.2.7): Core library for rendering component hierarchies.
  - `@tanstack/react-query` (v5.101.2): Manages asynchronous server state (caching, mutation, automatic refetches).
  - `react-router-dom` (v7.18.1): Handles client-side navigation.
  - `zustand` (v5.0.14): Extremely lightweight global state manager used for auth status, theme, and toast notifications.
  - `axios` (v1.18.1): HTTP client to query the backend REST endpoints.
  - `zod` (v4.4.3) & `react-hook-form` with `@hookform/resolvers`: Used in the login page for declarative input validation schemas.
  - `chart.js` & `react-chartjs-2`: Used for data plotting in the Admin Dashboard.
  - `lucide-react`: A clean vector icon set.
- **Scripts**:
  - `npm run dev`: Boots Vite development server locally on port `5173`.
  - `npm run build`: Runs the TypeScript compiler (`tsc -b`) and bundles files using Vite into the static `dist/` directory.

### B. `vite.config.ts`
Uses the official Vite React plugin (`@vitejs/plugin-react`) to bundle resources and transpile JSX/TypeScript codes.

---

## 3. Global Configuration & State Files

### A. `src/main.tsx`
- **What it does**: Initializes the React app and hooks it into the `#root` element of `index.html`.
- **Key Implementation details**:
  ```typescript
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false, // Prevents queries from automatically executing when clicking back on browser
        retry: 1,                    // Limit fetch retries on failure to 1
      },
    },
  })
  ```
  It wraps `<App />` inside `<QueryClientProvider client={queryClient}>` so React Query is available in all children.

---

### B. `src/App.tsx`
- **What it does**: Defines the routing tree, page-loading logic, and global layouts (Navbar, Chat Drawer, and Toast notifications).
- **Features & Implementation**:
  1. **Lazy Loading**:
     ```typescript
     const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
     ```
     By dynamic importing pages, Vite compiles each route into separate javascript chunks. They are loaded only when the user navigates to that path, optimizing initial load times.
  2. **Suspense boundaries**:
     ```typescript
     <React.Suspense fallback={<LoadingSpinner />}>
     ```
     Wraps the entire route directory. If a chunk is still downloading, it renders the rotating Neo-Brutalist loading circle.
  3. **Protected Routes Guard (`ProtectedRoute`)**:
     ```typescript
     const ProtectedRoute: React.FC = () => {
       const { isAuthenticated, checkingAuth } = useStore();
       if (checkingAuth) return <Spinner />;
       return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
     };
     ```
     Checks Zustand state. If checking auth, displays a loading spinner. If authenticated, renders the child routes via `<Outlet />`. Otherwise, redirects the browser to `/login`.
  4. **Global Toast Notification**:
     ```typescript
     {notification && (
       <div className="brut-toast" style={{ backgroundColor: getToastBg(notification.type) }}>
         {getToastIcon(notification.type)}
         <span>{notification.message}</span>
       </div>
     )}
     ```
     Renders at the bottom-right corner when `notification` exists. Styled dynamically depending on `notification.type` (`success`, `error`, `info`).

---

### C. `src/api.ts`
- **What it does**: Configures the HTTP Axios instance and sets up structural TypeScript interfaces representing backend models.
- **Features & Implementation**:
  1. **HTTP Config & Interceptors**:
     ```typescript
     export const api = axios.create({
       baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
       withCredentials: true, // Enables sending HTTP-Only cookies (like access_token) automatically
     });

     api.interceptors.request.use((config) => {
       const token = localStorage.getItem('token');
       if (token && !config.headers.Authorization) {
         config.headers.Authorization = `Bearer ${token}`; // Fallback JWT authorization header injection
       }
       return config;
     });
     ```
  2. **Interfaced API Methods**:
     - `authApi`: Signup, login, logout, getMe, listUsers, and updateUserRole.
     - `booksApi`: List (paginated, sorted, and searched), get details, create (Admin), update (Admin), delete (Admin), getReviews, and createReview.
     - `loansApi`: ListMy (Member), listAll (Admin), borrow (Book checkout), and return (Book check-in).
     - `chatApi`: SendMessage (Gemini query), getHistory, and clearHistory.

---

### D. `src/store.ts`
- **What it does**: Handles reactive global variables (User Auth status, Notifications, Theme toggle) using Zustand.
- **Features & Implementation**:
  1. **Instant Theme Bootstrapping**:
     ```typescript
     const initialTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
     document.documentElement.setAttribute('data-theme', initialTheme);
     ```
     Runs immediately on file load. Sets the `data-theme` attribute on the HTML element *before* React compiles the DOM, preventing a blinding white flash if the user has Dark Mode enabled.
  2. **Zustand Auth Store (`useStore`)**:
     - **`showToast(message, type)`**: Sets the notification state and fires a `setTimeout` to call `clearToast()` after `4000ms` (4 seconds).
     - **`login(username, password)`**: Calls `authApi.login`. On success, saves token, sets user data, updates `isAuthenticated = true`, and flashes a welcome toast. On error, extracts error messages from Axios and displays them.
     - **`logout()`**: Clears local token storage, notifies the backend to clear the HttpOnly cookies, and redirects the user state to empty.
     - **`checkAuth()`**: Fired on initial page mount inside `App.tsx`. Calls `authApi.getMe()` to check if a valid session cookie/token is present, setting login status automatically.
     - **`toggleTheme()`**: Toggles theme state, saves the choice in `localStorage`, and updates the DOM attribute `data-theme` dynamically.

---

## 4. Layout CSS Stylesheets

### A. `src/index.css`
Contains the core styles, CSS tokens, and animations.
- **Variables**: Sets light mode variables by default. Sets dark overrides inside `[data-theme="dark"]`.
- **Brutalist Tokens**:
  - `border-width: 2.5px`, `border-color: #000000`, `shadow-offset: 4px`.
- **Animations**:
  - `.brut-card.interactive` (Lines 85-93): Governs the raised card offset on hover (`transform: translate(-2px, -2px)`) and clicked compressions (`transform: translate(4px, 4px)`).
  - `@keyframes slideUp` (Lines 216-225): Moves the toast up from off-screen bottom-right with an elastic bounce.
  - `@keyframes spin`: Rotates loading spinners infinitely.

---

## 5. Components

### A. `src/components/Navbar.tsx`
- **What it does**: Core application header.
- **Features & Implementation**:
  - Displays the **Bibliotech** brand logo tilted at a dynamic brutalist rotation: `transform: 'rotate(-3deg)'` (Line 39).
  - Renders route links ("Catalog" and "Dashboard") dynamically depending on user login status.
  - **Dynamic User Profile Badge**: Renders the logged-in username inside a colored border card. If the user is an admin, the card is peach-colored (`var(--accent)`) and has a shield icon. If a member, it is lavender (`var(--secondary)`) and has a person icon.
  - **Theme Toggle Button**: Displays a Moon icon when light, or a Sun icon when dark, triggering `toggleTheme()` on click.
  - **Log Out Button**: Triggers `handleLogout()`, clear sessions, and pushes user back to `/login` via `useNavigate()`.

---

### B. `src/components/BookCard.tsx`
- **What it does**: Individual card layouts rendered inside the Catalog page grid.
- **Features & Implementation**:
  1. **Dynamic Category Colors**:
     ```typescript
     const getCategoryColor = (cat?: string) => { ... }
     ```
     Maps genres to CSS color tokens (e.g. Technology -> soft blue, Science Fiction -> lavender, Fiction -> yellow) to dynamically color cover placeholders.
  2. **Open Library Image Loading with Fallbacks**:
     ```typescript
     <img src={book.cover_image_url} onError={(e) => {
       e.currentTarget.style.display = 'none'; // Hides broken image
       const fallback = e.currentTarget.parentElement?.querySelector('.placeholder-cover');
       fallback?.setAttribute('style', 'display: flex; ...'); // Displays styled fallback cover card
     }} />
     ```
     If the cover image fails to load or is unavailable, the broken link is hidden, and a fallback card is displayed containing the book title, author, and category colors.
  3. **Numeric Star Ratings conversion**:
     Converts the float rating value into a 5-element array of `Star` vectors from Lucide-React. It fills elements with gold color up to the rating floor, leaving the rest grey.
  4. **Dynamic Stock Indicator**:
     Renders a badge indicating remaining copies. Green (`#4ADE80`) if in stock, or red (`#F87171`) saying "Out of Stock".
  5. **Contextual Action Buttons**:
     If a member, shows a yellow button "BORROW NOW". If out of stock, this button is disabled. If the query mutation is pending, it shows "BORROWING..." to prevent double submissions.

---

### C. `src/components/ChatAssistant.tsx`
- **What it does**: A floating toggle button on the bottom-right that opens a slide-out chat drawer, letting members ask the Gemini AI to search, review, borrow, and return books.
- **Features & Implementation**:
  1. **Slide-Out Drawer and Overlay**:
     Uses inline styles bound to `isOpen` state to handle the slide-out position. Toggling `isOpen` animates the right offset from `-420px` to `0` over `0.3s`. Renders a semi-transparent blur backdrop overlay that closes the drawer when clicked.
  2. **Optimistic UI Updates**:
     To make the chat interface feel responsive, when the user clicks "Send", we immediately append their message to the local query cache *before* the backend server resolves:
     ```typescript
     onMutate: async (newText) => {
       await queryClient.cancelQueries({ queryKey: ['chatHistory'] });
       const previousHistory = queryClient.getQueryData<ChatMessage[]>(['chatHistory']) || [];
       const tempUserMsg = { id: Date.now(), role: 'user', content: newText, ... };
       queryClient.setQueryData<ChatMessage[]>(['chatHistory'], [...previousHistory, tempUserMsg]);
       return { previousHistory };
     }
     ```
     If the API request fails, `onError` runs and rolls back the chat cache to `context.previousHistory` to maintain data integrity.
  3. **Auto-Scroll to Bottom**:
     ```typescript
     const messagesEndRef = useRef<HTMLDivElement>(null);
     const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     useEffect(() => { scrollToBottom(); }, [messages]);
     ```
     Whenever the message logs update, the viewport smoothly scrolls to the bottom element, keeping active conversations in view.
  4. **Automatic Catalog/Dashboard Sync**:
     ```typescript
     if (res.actions_taken.some(act => act.toLowerCase().includes('borrow') || act.toLowerCase().includes('return'))) {
       queryClient.invalidateQueries({ queryKey: ['books'] });
       queryClient.invalidateQueries({ queryKey: ['loans'] });
     }
     ```
     If the assistant executes a database mutation tool call on the backend (e.g. checking out a book or checking in a loan), the frontend immediately invalidates the book list and loan states, prompting an automatic background refetch so the catalog cards and dashboards reflect the changes.
  5. **Conversation Reset**:
     Calls `chatApi.clearHistory()` to truncate message records in the database, resetting the chat view locally.

---

## 6. Page Routes

### A. `src/pages/LoginPage.tsx`
- **What it does**: Manages login authentication and registration accounts.
- **Features & Implementation**:
  1. **Validation using React Hook Form & Zod Schema**:
     Defines `authSchema` to enforce validation rules:
     - Username must be 3-50 characters, alphanumeric and underscores only (`/^[a-zA-Z0-9_]+$/`).
     - Password must be 6-50 characters.
     - Email is required for registration and must match regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
  2. **Switchable Flows (Login vs. Signup)**:
     - Switches state via `isLogin` boolean. Toggling clears form state fields using `reset()`.
     - Standardizes forms to render specific inputs (like email and full name) only when creating accounts.

---

### B. `src/pages/CatalogPage.tsx`
- **What it does**: Directory of books.
- **Features & Implementation**:
  1. **Multi-Param Filter Queries**:
     Uses state hooks for `search`, `category`, `page`, `sortBy`, and `order`. These variables bind directly to React Query keys:
     ```typescript
     queryKey: ['books', { search, category, page, sortBy, order }]
     ```
     Whenever any dropdown value or pagination button changes, React Query automatically triggers a fetch with the updated query parameters.
  2. **Pagination UI**:
     Displays dynamic `PAGE X OF Y` state cards. Disables the "PREV" button on page `1`, and disables the "NEXT" button on the last page.
  3. **Admin: Add Book Dialog Modal**:
     Admins can click "ADD BOOK" to open a modal overlay. Binds inputs for title, author, publisher, copies, and category, and calls `booksApi.create(payload)` to add the book to the database.

---

### C. `src/pages/BookDetailPage.tsx`
- **What it does**: Detailed view of a single book.
- **Features & Implementation**:
  1. **Dynamic Review Submission Form**:
     Renders a star rating selector (buttons 1-5 that update local rating states on click) and comment textarea. Calls `booksApi.createReview()` and invalidates the `bookReviews` query key on submission.
  2. **Single-Review Enforcer**:
     ```typescript
     const hasReviewed = reviews.some(r => r.user_id === user?.id);
     ```
     Checks the review list. If the user has already submitted a review, it hides the form and displays a blue alert box to enforce the one-review-per-user constraint.
  3. **Admin: Edit Book Modal & Delete Action**:
     If user role is admin, renders edit/delete buttons. Clicking delete triggers `window.confirm`. On approval, calls `booksApi.delete(bookId)` and redirects the user back to the catalog.

---

### D. `src/pages/DashboardPage.tsx`
- **What it does**: The central hub for administrative oversight and user loan records.
- **Features & Implementation**:
  1. **Admin: Tabbed Interface**:
     - **Loans Tab**: Displays checkout transactions. Includes a button to return a book, which updates database records.
     - **Manage Permissions Tab**: Displays all users. Admins can promote members to admins, or demote admins to members, using `changeRoleMutation`. Prevents demoting oneself via an ID comparison check.
     - **System Analytics Tab**: Renders visual category bar charts and status distribution doughnut charts.
  2. **Filter States (All / Active / Overdue)**:
     Limits table results locally using filter methods on the fetched list. Updates counts in real-time on page filters.
  3. **Brutalist Stats Counter Row**:
     Displays total checkouts, active loans, and overdue counts inside styled Neo-Brutalist cards. If there are overdue loans, the count card turns red (`var(--accent)`) and displays an alert icon.
