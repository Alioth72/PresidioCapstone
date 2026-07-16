import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi, loansApi, type BookUpdatePayload } from '../api';
import { useStore } from '../store';
import { Star, ChevronLeft, BookOpen, Trash2, Edit2, CheckCircle } from 'lucide-react';

export const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, showToast } = useStore();
  const queryClient = useQueryClient();

  const bookId = parseInt(id || '0');

  // Review Form States
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // Admin Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPublisher, setEditPublisher] = useState('');
  const [editYear, setEditYear] = useState(2000);
  const [editTotalCopies, setEditTotalCopies] = useState(1);
  const [editDescription, setEditDescription] = useState('');

  // Fetch book details
  const { data: book, isLoading: isLoadingBook, error: bookError } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => booksApi.get(bookId),
    enabled: !!bookId,
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ['bookReviews', bookId],
    queryFn: () => booksApi.getReviews(bookId),
    enabled: !!bookId,
  });

  // Automatically fill edit modal fields once book details are available
  useEffect(() => {
    if (book) {
      setEditTitle(book.title);
      setEditAuthor(book.author);
      setEditCategory(book.category || '');
      setEditPublisher(book.publisher || '');
      setEditYear(book.publication_year || 2000);
      setEditTotalCopies(book.total_copies);
      setEditDescription(book.description || '');
    }
  }, [book, showEditModal]);

  // Handle errors
  useEffect(() => {
    if (bookError) {
      showToast('Book details not found.', 'error');
      navigate('/');
    }
  }, [bookError]);

  const borrowMutation = useMutation({
    mutationFn: () => loansApi.borrow(bookId),
    onSuccess: () => {
      showToast(`Successfully borrowed "${book?.title}"!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (err) => {
      let msg = 'Failed to borrow book.';
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }
      showToast(msg, 'error');
    }
  });

  const handleBorrow = () => {
    if (!book) return;
    borrowMutation.mutate();
  };

  const reviewMutation = useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment?: string }) =>
      booksApi.createReview(bookId, rating, comment),
    onSuccess: () => {
      showToast('Review submitted successfully!', 'success');
      setComment('');
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({ queryKey: ['bookReviews', bookId] });
    },
    onError: (err) => {
      let msg = 'Failed to submit review.';
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }
      showToast(msg, 'error');
    }
  });

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      showToast('Please select a rating between 1 and 5.', 'error');
      return;
    }
    reviewMutation.mutate({ rating, comment: comment || undefined });
  };

  const deleteBookMutation = useMutation({
    mutationFn: () => booksApi.delete(bookId),
    onSuccess: () => {
      showToast('Book deleted from catalog successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['books'] });
      navigate('/');
    },
    onError: (err) => {
      let msg = 'Failed to delete book.';
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }
      showToast(msg, 'error');
    }
  });

  const handleDeleteBook = () => {
    if (book && window.confirm(`Are you absolutely sure you want to delete "${book.title}" from the catalog?`)) {
      deleteBookMutation.mutate();
    }
  };

  const editBookMutation = useMutation({
    mutationFn: (payload: BookUpdatePayload) => booksApi.update(bookId, payload),
    onSuccess: () => {
      showToast('Book catalog record updated.', 'success');
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['book', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err) => {
      let msg = 'Failed to update book.';
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }
      showToast(msg, 'error');
    }
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editBookMutation.mutate({
      title: editTitle,
      author: editAuthor,
      category: editCategory || undefined,
      publisher: editPublisher || undefined,
      publication_year: editYear || undefined,
      total_copies: editTotalCopies,
      description: editDescription || undefined
    });
  };

  const hasReviewed = reviews.some(r => r.user_id === user?.id);

  if (isLoadingBook) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div style={{
          display: 'inline-block',
          width: '50px',
          height: '50px',
          border: '5px solid var(--primary)',
          borderTopColor: 'transparent',
          animation: 'spin 1s linear infinite',
          boxShadow: '2px 2px 0px #000000'
        }} />
        <p style={{ marginTop: '1rem', fontWeight: 700 }}>LOADING DETAILS...</p>
      </div>
    );
  }

  if (!book) return null;

  const renderStars = (num: number, size = 16) => {
    const floor = Math.floor(num);
    const starsList = [];
    for (let i = 1; i <= 5; i++) {
      starsList.push(
        <Star
          key={i}
          size={size}
          fill={i <= floor ? 'gold' : 'none'}
          color={i <= floor ? 'orange' : '#9CA3AF'}
          style={{ marginRight: '2px' }}
        />
      );
    }
    return starsList;
  };

  return (
    <div className="container">
      {/* Back Button */}
      <Link to="/" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        textDecoration: 'none',
        color: '#000000',
        fontWeight: 700,
        marginBottom: '1.5rem',
        fontSize: '0.9rem'
      }}>
        <ChevronLeft size={18} strokeWidth={2.5} /> BACK TO CATALOG
      </Link>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2.5rem',
        alignItems: 'start'
      }}>
        {/* Left Column: Cover Placeholder */}
        <div className="brut-card" style={{
          backgroundColor: '#FFFFFF',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          boxShadow: '6px 6px 0px #000000'
        }}>
          <div style={{
            width: '100%',
            height: '420px',
            backgroundColor: '#F3F4F6',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '2px solid #000000',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={book.title}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.fallback-full-cover');
                    if (fallback) fallback.setAttribute('style', 'display: flex; flex-direction: column; align-items: center;');
                  }
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem' }}
              />
            ) : null}

            {/* Fallback Cover */}
            <div className="fallback-full-cover" style={{
              display: book.cover_image_url ? 'none' : 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <BookOpen size={72} strokeWidth={2.5} style={{ marginBottom: '1rem' }} />
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{book.title}</h2>
              <p style={{ color: '#4B5563', marginTop: '0.5rem' }}>{book.author}</p>
            </div>
          </div>

          {/* Copy stock info */}
          <div style={{
            width: '100%',
            marginTop: '1.5rem',
            border: '2px solid #000000',
            padding: '1rem',
            backgroundColor: book.available_copies > 0 ? '#ECFDF5' : '#FEF2F2',
            textAlign: 'center',
            fontWeight: 700
          }}>
            {book.available_copies > 0 ? (
              <span style={{ color: '#047857' }}>
                ✅ {book.available_copies} of {book.total_copies} COPIES AVAILABLE TO BORROW
              </span>
            ) : (
              <span style={{ color: '#B91C1C' }}>
                ❌ OUT OF STOCK (All copies are currently loaned out)
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Metadata & Reviews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Main Info Card */}
          <div className="brut-card" style={{ backgroundColor: '#FFFFFF', padding: '2rem' }}>
            {book.category && (
              <span style={{
                backgroundColor: 'var(--secondary)',
                border: '1.5px solid #000000',
                padding: '0.2rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-block',
                marginBottom: '0.75rem',
                boxShadow: '1.5px 1.5px 0px #000000'
              }}>
                {book.category}
              </span>
            )}

            <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', lineHeight: 1.1 }}>
              {book.title}
            </h1>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#4B5563', marginBottom: '1.25rem' }}>
              by {book.author}
            </p>

            {/* Rating Stars Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #F3F4F6', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex' }}>
                {renderStars(book.average_rating, 20)}
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {book.average_rating ? book.average_rating.toFixed(1) : '0.0'}
              </span>
              <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>
                ({book.review_count} {book.review_count === 1 ? 'review' : 'reviews'})
              </span>
            </div>

            {/* Description Text */}
            <h3 style={{ fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Description</h3>
            <p style={{
              lineHeight: 1.6,
              color: '#374151',
              fontSize: '0.95rem',
              marginBottom: '1.5rem'
            }}>
              {book.description || 'No description has been added for this catalog item.'}
            </p>

            {/* Detailed Properties */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
              backgroundColor: '#FAF7F2',
              padding: '1rem',
              border: '2px solid #000000'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>ISBN</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{book.isbn || 'N/A'}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Publisher</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{book.publisher || 'N/A'}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Publication Year</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{book.publication_year || 'N/A'}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {user?.role === 'member' && (
                <button
                  onClick={handleBorrow}
                  disabled={book.available_copies <= 0}
                  className="brut-btn brut-btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  BORROW THIS BOOK
                </button>
              )}

              {user?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="brut-btn brut-btn-secondary"
                    style={{ flex: 1, justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Edit2 size={16} /> EDIT DETAILS
                  </button>
                  <button
                    onClick={handleDeleteBook}
                    className="brut-btn brut-btn-accent"
                    style={{ flex: 1, justifyContent: 'center', gap: '0.5rem', backgroundColor: '#FEF2F2' }}
                  >
                    <Trash2 size={16} color="#DC2626" /> DELETE BOOK
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Reviews & Ratings Section */}
          <div className="brut-card" style={{ backgroundColor: '#FFFFFF', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)', borderBottom: '2.5px solid #000000', paddingBottom: '0.5rem' }}>
              REVIEWS
            </h2>

            {/* Review Submission Form (Members only, one per member) */}
            {user?.role === 'member' && (
              <div style={{
                marginBottom: '2rem',
                borderBottom: '2px dashed #000000',
                paddingBottom: '2rem'
              }}>
                {hasReviewed ? (
                  <div style={{
                    backgroundColor: '#EFF6FF',
                    border: '2px solid #3B82F6',
                    padding: '1rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <CheckCircle size={18} color="#2563EB" /> You have already reviewed this book.
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Add a Review</h3>
                    
                    {/* Star selection */}
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase' }}>Rating</span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRating(num)}
                            style={{
                              backgroundColor: num <= rating ? 'var(--primary)' : '#F3F4F6',
                              border: '2px solid #000000',
                              width: '36px',
                              height: '36px',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: '1.5px 1.5px 0px #000000'
                            }}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comment text area */}
                    <div>
                      <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase' }}>Comment</span>
                      <textarea
                        className="brut-input"
                        rows={3}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="What did you think of the book? Write your thoughts..."
                        style={{ fontFamily: 'var(--font-sans)', resize: 'vertical' }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="brut-btn brut-btn-secondary"
                      disabled={reviewMutation.isPending}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      {reviewMutation.isPending ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <p style={{ color: '#6B7280', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
                There are no reviews for this book yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reviews.map((rev) => (
                  <div key={rev.id} style={{
                    border: '2px solid #000000',
                    padding: '1rem',
                    backgroundColor: '#FAF7F2',
                    boxShadow: '2px 2px 0px #000000'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{rev.username}</span>
                      <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', marginBottom: '0.5rem' }}>
                      {renderStars(rev.rating, 14)}
                    </div>

                    {rev.comment && (
                      <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0, lineHeight: 1.4 }}>
                        "{rev.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Admin Edit Modal */}
      {showEditModal && (
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
            backgroundColor: '#FFFFFF',
            boxShadow: '8px 8px 0px #000000',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2.5px solid #000000', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>Edit Catalog Record</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="brut-btn brut-btn-flat"
                style={{ padding: '0.25rem' }}
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Title *</label>
                  <input type="text" className="brut-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Author *</label>
                  <input type="text" className="brut-input" value={editAuthor} onChange={e => setEditAuthor(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Category</label>
                  <input type="text" className="brut-input" value={editCategory} onChange={e => setEditCategory(e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Publisher</label>
                  <input type="text" className="brut-input" value={editPublisher} onChange={e => setEditPublisher(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Publication Year</label>
                  <input type="number" className="brut-input" value={editYear} onChange={e => setEditYear(parseInt(e.target.value) || 0)} />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Total Copies *</label>
                  <input type="number" min="1" className="brut-input" value={editTotalCopies} onChange={e => setEditTotalCopies(parseInt(e.target.value) || 1)} required />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Description</label>
                <textarea className="brut-input" rows={4} value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{ fontFamily: 'var(--font-sans)', resize: 'vertical' }} />
              </div>

              <button
                type="submit"
                className="brut-btn brut-btn-primary"
                disabled={editBookMutation.isPending}
                style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
              >
                {editBookMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
