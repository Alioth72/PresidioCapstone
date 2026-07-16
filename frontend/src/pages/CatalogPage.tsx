import React, { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi, type BookCreatePayload } from '../api';
import { useStore } from '../store';
import { BookCard } from '../components/BookCard';
import { Search, Plus, X, BookOpen } from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { user, showToast } = useStore();
  const queryClient = useQueryClient();

  // Search & Pagination States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('title');
  const [order, setOrder] = useState('asc');

  // Admin Create Book Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPublisher, setNewPublisher] = useState('');
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());
  const [newCopies, setNewCopies] = useState<number>(1);

  // Available Categories for Seeding Filter
  const categories = [
    'Fiction',
    'Literary Fiction',
    'Science Fiction',
    'Fantasy',
    'Mystery',
    'Thriller',
    'Science',
    'Technology',
    'History',
    'Philosophy',
    'Psychology',
    'Business',
    'Economics',
    'Mathematics'
  ];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['books', { search, category, page, sortBy, order }],
    queryFn: () => booksApi.list({
      search: search || undefined,
      category: category || undefined,
      page,
      limit: 12,
      sort_by: sortBy,
      order
    }),
  });

  const books = data?.items || [];
  const totalPages = data?.pages || 1;

  // Handle Search Input Debounce-like trigger or simple submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const addBookMutation = useMutation({
    mutationFn: (payload: BookCreatePayload) => booksApi.create(payload),
    onSuccess: (createdBook) => {
      showToast(`Successfully added "${createdBook.title}"!`, 'success');
      setShowAddModal(false);
      
      // Reset form fields
      setNewTitle('');
      setNewAuthor('');
      setNewIsbn('');
      setNewCategory('');
      setNewDescription('');
      setNewPublisher('');
      setNewYear(new Date().getFullYear());
      setNewCopies(1);
      
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err) => {
      let msg = 'Failed to create book.';
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }
      showToast(msg, 'error');
    }
  });

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) {
      showToast('Title and Author are required.', 'error');
      return;
    }

    addBookMutation.mutate({
      title: newTitle,
      author: newAuthor,
      isbn: newIsbn || undefined,
      category: newCategory || undefined,
      description: newDescription || undefined,
      publisher: newPublisher || undefined,
      publication_year: newYear || undefined,
      total_copies: newCopies
    });
  };

  return (
    <div className="container">
      {/* Intro Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontFamily: 'var(--font-heading)', color: 'var(--text-color)' }}>
            THE CATALOG
          </h1>
          <p style={{ color: 'var(--text-color)', opacity: 0.8, fontWeight: 500, marginTop: '0.25rem' }}>
            Browse and borrow from our curated selection of fine texts.
          </p>
        </div>

        {user?.role === 'admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="brut-btn brut-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#000000' }}
          >
            <Plus size={18} strokeWidth={2.5} /> ADD BOOK
          </button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="brut-card" style={{
        backgroundColor: 'var(--card-bg)',
        padding: '1.25rem',
        marginBottom: '2rem'
      }}>
        <form onSubmit={handleSearchSubmit} style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Search Input */}
          <div style={{ flex: 2, minWidth: '250px', position: 'relative' }}>
            <input
              type="text"
              className="brut-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, author, publisher, ISBN..."
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
          </div>

          {/* Category Dropdown */}
          <div style={{ flex: 1, minWidth: '180px' }}>
            <select
              className="brut-input brut-input-select"
              value={category}
              onChange={e => { setCategory(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ flex: 0.8, minWidth: '150px' }}>
            <select
              className="brut-input brut-input-select"
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1); }}
            >
              <option value="title">Sort by Title</option>
              <option value="author">Sort by Author</option>
              <option value="publication_year">Sort by Year</option>
              <option value="created_at">Sort by Date Added</option>
            </select>
          </div>

          {/* Order Dropdown */}
          <div style={{ flex: 0.5, minWidth: '100px' }}>
            <select
              className="brut-input brut-input-select"
              value={order}
              onChange={e => { setOrder(e.target.value); setPage(1); }}
            >
              <option value="asc">ASC</option>
              <option value="desc">DESC</option>
            </select>
          </div>
        </form>
      </div>

      {/* Catalog Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{
            display: 'inline-block',
            width: '50px',
            height: '50px',
            border: '5px solid var(--primary)',
            borderTopColor: 'transparent',
            animation: 'spin 1s linear infinite',
            boxShadow: '2px 2px 0px var(--border-color)'
          }} />
          <p style={{ marginTop: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-color)' }}>LOADING CATALOG...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : books.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1rem',
          border: '3px dashed var(--border-color)',
          backgroundColor: 'var(--card-bg)',
          color: 'var(--text-color)'
        }}>
          <BookOpen size={48} style={{ margin: '0 auto 1rem auto', color: '#9CA3AF' }} />
          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>No books found</h3>
          <p style={{ color: 'var(--text-color)', opacity: 0.8, marginTop: '0.25rem' }}>Try broadening your search term or selection filters.</p>
        </div>
      ) : (
        <>
          <div className="brut-grid">
            {books.map(book => (
              <BookCard key={book.id} book={book} onRefresh={refetch} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '3rem',
              marginBottom: '2rem'
            }}>
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="brut-btn brut-btn-primary"
                style={{ padding: '0.5rem 1.25rem', boxShadow: '2px 2px 0px var(--border-color)' }}
              >
                PREV
              </button>
              
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: '1.1rem',
                border: '2px solid var(--border-color)',
                padding: '0.4rem 1rem',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-color)',
                boxShadow: '2px 2px 0px var(--border-color)'
              }}>
                PAGE {page} OF {totalPages}
              </div>

              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="brut-btn brut-btn-primary"
                style={{ padding: '0.5rem 1.25rem', boxShadow: '2px 2px 0px var(--border-color)' }}
              >
                NEXT
              </button>
            </div>
          )}
        </>
      )}

      {/* Admin Add Book Drawer Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 600
        }}>
          <div className="brut-card" style={{
            width: '600px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: 'var(--card-bg)',
            boxShadow: '8px 8px 0px var(--border-color)',
            color: 'var(--text-color)',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2.5px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', color: 'var(--text-color)' }}>Add New Book to Catalog</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="brut-btn brut-btn-flat"
                style={{ padding: '0.25rem' }}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleAddBook} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Title *</label>
                  <input type="text" className="brut-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="e.g. Clean Architecture" />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Author *</label>
                  <input type="text" className="brut-input" value={newAuthor} onChange={e => setNewAuthor(e.target.value)} required placeholder="e.g. Robert C. Martin" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>ISBN</label>
                  <input type="text" className="brut-input" value={newIsbn} onChange={e => setNewIsbn(e.target.value)} placeholder="e.g. 978-0135957059" />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Category</label>
                  <select className="brut-input brut-input-select" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1.5, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Publisher</label>
                  <input type="text" className="brut-input" value={newPublisher} onChange={e => setNewPublisher(e.target.value)} placeholder="e.g. Prentice Hall" />
                </div>
                <div style={{ flex: 0.7, minWidth: '100px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Year</label>
                  <input type="number" className="brut-input" value={newYear} onChange={e => setNewYear(parseInt(e.target.value) || 0)} />
                </div>
                <div style={{ flex: 0.5, minWidth: '80px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Copies</label>
                  <input type="number" min="1" className="brut-input" value={newCopies} onChange={e => setNewCopies(parseInt(e.target.value) || 1)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Description</label>
                <textarea className="brut-input" rows={3} value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Provide summary details about this book..." style={{ fontFamily: 'var(--font-sans)', resize: 'vertical' }} />
              </div>

              <button
                type="submit"
                className="brut-btn brut-btn-primary"
                disabled={addBookMutation.isPending}
                style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
              >
                {addBookMutation.isPending ? 'CREATING...' : 'CREATE BOOK'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
