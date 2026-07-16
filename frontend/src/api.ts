import axios from 'axios';

// Create Axios Instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true, // Send HttpOnly session cookies
});

// Inject Authorization header fallback if present in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Interfaces ───

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'member';
  is_active: boolean;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  category?: string;
  publisher?: string;
  publication_year?: number;
  total_copies: number;
  available_copies: number;
  cover_image_url?: string;
  average_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  user_id: number;
  book_id: number;
  rating: number;
  comment?: string;
  created_at: string;
  username: string;
}

export interface Loan {
  id: number;
  user_id: number;
  book_id: number;
  borrowed_at: string;
  due_date: string;
  returned_at?: string;
  is_active: boolean;
  is_overdue: boolean;
  book_title: string;
  book_author: string;
  username: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  actions_taken: string[];
  created_at: string;
}

export interface UserRegisterPayload {
  username: string;
  email: string;
  full_name?: string;
  password?: string;
  role?: 'admin' | 'member';
}

export interface BookCreatePayload {
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  category?: string;
  publisher?: string;
  publication_year?: number;
  total_copies?: number;
  cover_image_url?: string;
}

export interface BookUpdatePayload {
  title?: string;
  author?: string;
  isbn?: string;
  description?: string;
  category?: string;
  publisher?: string;
  publication_year?: number;
  total_copies?: number;
  cover_image_url?: string;
}

export interface PaginatedBooks {
  items: Book[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

// ─── API Methods ───

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await api.post<{ access_token: string; token_type: string; user: User }>(
      '/api/auth/login',
      { username, password }
    );
    // Store token in localStorage as fallback
    localStorage.setItem('token', res.data.access_token);
    return res.data;
  },
  register: async (payload: UserRegisterPayload) => {
    const res = await api.post<User>('/api/auth/signup', payload);
    return res.data;
  },
  logout: async () => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('token');
  },
  getMe: async () => {
    const res = await api.get<User>('/api/auth/me');
    return res.data;
  },
  listUsers: async () => {
    const res = await api.get<User[]>('/api/auth/users');
    return res.data;
  },
  updateUserRole: async (userId: number, role: 'admin' | 'member') => {
    const res = await api.put<User>(`/api/auth/users/${userId}/role`, { role });
    return res.data;
  },
};

export const booksApi = {
  list: async (params: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    order?: string;
  }) => {
    const res = await api.get<PaginatedBooks>('/api/books/', { params });
    return res.data;
  },
  get: async (id: number) => {
    const res = await api.get<Book>(`/api/books/${id}`);
    return res.data;
  },
  create: async (payload: BookCreatePayload) => {
    const res = await api.post<Book>('/api/books/', payload);
    return res.data;
  },
  update: async (id: number, payload: BookUpdatePayload) => {
    const res = await api.put<Book>(`/api/books/${id}`, payload);
    return res.data;
  },
  delete: async (id: number) => {
    await api.delete(`/api/books/${id}`);
  },
  getReviews: async (bookId: number) => {
    const res = await api.get<Review[]>(`/api/books/${bookId}/reviews`);
    return res.data;
  },
  createReview: async (bookId: number, rating: number, comment?: string) => {
    const res = await api.post<Review>(`/api/books/${bookId}/reviews`, { rating, comment });
    return res.data;
  },
};

export const loansApi = {
  listMy: async () => {
    const res = await api.get<Loan[]>('/api/loans/my');
    return res.data;
  },
  listAll: async () => {
    const res = await api.get<Loan[]>('/api/loans/all');
    return res.data;
  },
  borrow: async (bookId: number) => {
    const res = await api.post<Loan>('/api/loans/borrow', { book_id: bookId });
    return res.data;
  },
  return: async (loanId: number) => {
    const res = await api.post<{ message: string; loan: Loan }>(`/api/loans/${loanId}/return`);
    return res.data;
  },
};

export const chatApi = {
  sendMessage: async (message: string) => {
    const res = await api.post<{ reply: string; actions_taken: string[] }>('/api/chat/', { message });
    return res.data;
  },
  getHistory: async () => {
    const res = await api.get<ChatMessage[]>('/api/chat/history');
    return res.data;
  },
  clearHistory: async () => {
    await api.delete('/api/chat/history');
  },
};
