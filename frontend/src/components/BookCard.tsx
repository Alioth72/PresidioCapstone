import React from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Book, loansApi } from '../api';
import { useStore } from '../store';
import { Star, BookOpen } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onRefresh?: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onRefresh }) => {
  const { user, showToast } = useStore();
  const queryClient = useQueryClient();

  // Helper to color placeholder based on category
  const getCategoryColor = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case 'fiction': return 'var(--primary)';
      case 'literary fiction': return 'var(--primary)';
      case 'science fiction': return 'var(--secondary)';
      case 'fantasy': return 'var(--secondary)';
      case 'mystery': return 'var(--accent)';
      case 'thriller': return 'var(--accent)';
      case 'technology': return '#93C5FD'; // Soft blue
      case 'science': return '#86EFAC'; // Soft green
      default: return '#E5E7EB';
    }
  };

  const borrowMutation = useMutation({
    mutationFn: () => loansApi.borrow(book.id),
    onSuccess: () => {
      showToast(`Successfully borrowed "${book.title}"! Check your Dashboard.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      if (onRefresh) onRefresh();
    },
    onError: (err) => {
      let msg = 'Failed to borrow book.';
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }
      showToast(msg, 'error');
    }
  });

  const handleBorrow = (e: React.MouseEvent) => {
    e.preventDefault(); // Stop navigation to detail page if clicked borrow button
    if (book.available_copies <= 0) {
      showToast('No copies available right now.', 'error');
      return;
    }
    borrowMutation.mutate();
  };

  const stars = [];
  const ratingFloor = Math.floor(book.average_rating || 0);
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        size={14}
        fill={i <= ratingFloor ? 'gold' : 'none'}
        color={i <= ratingFloor ? 'orange' : '#9CA3AF'}
        style={{ marginRight: '1px' }}
      />
    );
  }

  return (
    <div className="brut-card interactive" style={{
      padding: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Cover Image Wrapper */}
      <Link to={`/books/${book.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{
          height: '240px',
          borderBottom: 'var(--border-width) solid var(--border-color)',
          position: 'relative',
          backgroundColor: '#F3F4F6',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}>
          {book.cover_image_url ? (
            <img
              src={book.cover_image_url}
              alt={book.title}
              onError={(e) => {
                // If Open Library cover fails, clear it so the placeholder renders
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const placeholder = parent.querySelector('.placeholder-cover');
                  if (placeholder) placeholder.setAttribute('style', 'display: flex; width: 100%; height: 100%; justify-content: center; align-items: center; flex-direction: column;');
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain', // keeps covers sharp
                padding: '0.5rem',
                transition: 'transform 0.3s ease'
              }}
            />
          ) : null}

          {/* Fallback Placeholder Cover */}
          <div
            className="placeholder-cover"
            style={{
              display: book.cover_image_url ? 'none' : 'flex',
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              backgroundColor: getCategoryColor(book.category),
              padding: '1rem',
              textAlign: 'center'
            }}
          >
            <BookOpen size={48} strokeWidth={2.5} style={{ marginBottom: '0.5rem' }} />
            <div style={{
              fontWeight: 800,
              fontSize: '1rem',
              lineHeight: 1.2,
              fontFamily: 'var(--font-heading)',
              textTransform: 'uppercase'
            }}>
              {book.title}
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>
              {book.author}
            </div>
          </div>

          {/* Category Tag */}
          {book.category && (
            <span style={{
              position: 'absolute',
              top: '0.5rem',
              left: '0.5rem',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #000000',
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              boxShadow: '1.5px 1.5px 0px #000000'
            }}>
              {book.category}
            </span>
          )}

          {/* Copy Count Tag */}
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            right: '0.5rem',
            backgroundColor: book.available_copies > 0 ? '#4ADE80' : '#F87171',
            color: '#000000',
            border: '1.5px solid #000000',
            padding: '0.2rem 0.5rem',
            fontSize: '0.75rem',
            fontWeight: 800,
            boxShadow: '1.5px 1.5px 0px #000000'
          }}>
            {book.available_copies > 0 ? `${book.available_copies}/${book.total_copies} Left` : 'Out of Stock'}
          </div>
        </div>

        {/* Content Box */}
        <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            {stars}
            <span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: '0.4rem', color: '#4B5563' }}>
              ({book.average_rating ? book.average_rating.toFixed(1) : '0.0'})
            </span>
          </div>

          {/* Title & Author */}
          <h3 style={{
            fontSize: '1.2rem',
            margin: '0 0 0.25rem 0',
            lineHeight: 1.2,
            height: '2.8rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }} title={book.title}>
            {book.title}
          </h3>
          <p style={{
            fontSize: '0.85rem',
            color: '#4B5563',
            marginBottom: '1rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            by {book.author}
          </p>
        </div>
      </Link>

      {/* Buttons Action Bar */}
      <div style={{
        marginTop: 'auto',
        display: 'flex',
        borderTop: 'var(--border-width) solid var(--border-color)',
        backgroundColor: '#FFFFFF'
      }}>
        <Link
          to={`/books/${book.id}`}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.6rem 0',
            fontWeight: 700,
            fontSize: '0.85rem',
            textDecoration: 'none',
            color: 'var(--text-color)',
            borderRight: 'var(--border-width) solid var(--border-color)',
            fontFamily: 'var(--font-heading)'
          }}
          className="brut-btn-flat"
        >
          DETAILS
        </Link>
        {user?.role === 'member' && (
          <button
            onClick={handleBorrow}
            disabled={book.available_copies <= 0 || borrowMutation.isPending}
            style={{
              flex: 1.2,
              padding: '0.6rem 0',
              fontWeight: 800,
              fontSize: '0.85rem',
              backgroundColor: 'var(--primary)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-heading)'
            }}
            className="brut-btn-flat"
          >
            {borrowMutation.isPending ? 'BORROWING...' : 'BORROW NOW'}
          </button>
        )}
      </div>
    </div>
  );
};
