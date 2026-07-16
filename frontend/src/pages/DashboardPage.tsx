import React, { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loansApi } from '../api';
import { useStore } from '../store';
import { RefreshCw, CheckCircle, Clock, ShieldAlert, ArrowLeftRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, showToast } = useStore();
  const queryClient = useQueryClient();
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'overdue'>('all');

  const { data: loans = [], isLoading, refetch } = useQuery({
    queryKey: ['loans', user?.role],
    queryFn: () => user?.role === 'admin' ? loansApi.listAll() : loansApi.listMy(),
    enabled: !!user,
  });

  const returnMutation = useMutation({
    mutationFn: (loanId: number) => loansApi.return(loanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err) => {
      let msg = 'Failed to return book.';
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }
      showToast(msg, 'error');
    }
  });

  const handleReturn = (loanId: number, bookTitle: string) => {
    returnMutation.mutate(loanId, {
      onSuccess: () => {
        showToast(`Successfully returned "${bookTitle}"!`, 'success');
      }
    });
  };

  // Filtered lists (mainly for Admin oversight, though members can also use it)
  const filteredLoans = loans.filter(l => {
    if (filterMode === 'active') return l.is_active;
    if (filterMode === 'overdue') return l.is_active && l.is_overdue;
    return true; // 'all'
  });

  const activeLoansCount = loans.filter(l => l.is_active).length;
  const overdueLoansCount = loans.filter(l => l.is_active && l.is_overdue).length;

  if (isLoading) {
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
        <p style={{ marginTop: '1rem', fontWeight: 700 }}>LOADING DASHBOARD...</p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Intro section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>
            {user?.role === 'admin' ? 'ADMIN LOAN OVERSIGHT' : 'MY LIBRARY DASHBOARD'}
          </h1>
          <p style={{ color: '#4B5563', fontWeight: 500, marginTop: '0.25rem' }}>
            {user?.role === 'admin' 
              ? 'Monitor book checkouts, track due dates, and resolve member loans.' 
              : 'View your currently borrowed titles, due dates, and borrow history.'}
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="brut-btn brut-btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
        >
          <RefreshCw size={16} /> REFRESH
        </button>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2.5rem'
      }}>
        {/* Total checkouts card */}
        <div className="brut-card" style={{ backgroundColor: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #000000', padding: '0.75rem', display: 'flex' }}>
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Total Transactions</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 900 }}>{loans.length}</span>
          </div>
        </div>

        {/* Active checkouts card */}
        <div className="brut-card" style={{ backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #000000', padding: '0.75rem', display: 'flex' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Active Loans</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 900 }}>{activeLoansCount}</span>
          </div>
        </div>

        {/* Overdue checkouts card */}
        <div className="brut-card" style={{ 
          backgroundColor: overdueLoansCount > 0 ? 'var(--accent)' : '#E5E7EB', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem' 
        }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #000000', padding: '0.75rem', display: 'flex' }}>
            <ShieldAlert size={24} color={overdueLoansCount > 0 ? '#DC2626' : '#000000'} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Overdue Loans</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: overdueLoansCount > 0 ? '#DC2626' : '#000000' }}>
              {overdueLoansCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Mode Buttons (mainly for Admins, but also nice for Members) */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setFilterMode('all')}
          className="brut-btn"
          style={{
            padding: '0.4rem 1rem',
            fontSize: '0.85rem',
            backgroundColor: filterMode === 'all' ? 'var(--primary)' : '#FFFFFF',
            boxShadow: '2px 2px 0px #000000'
          }}
        >
          ALL LOANS
        </button>
        <button
          onClick={() => setFilterMode('active')}
          className="brut-btn"
          style={{
            padding: '0.4rem 1rem',
            fontSize: '0.85rem',
            backgroundColor: filterMode === 'active' ? 'var(--primary)' : '#FFFFFF',
            boxShadow: '2px 2px 0px #000000'
          }}
        >
          ACTIVE LOANS ({activeLoansCount})
        </button>
        <button
          onClick={() => setFilterMode('overdue')}
          className="brut-btn"
          style={{
            padding: '0.4rem 1rem',
            fontSize: '0.85rem',
            backgroundColor: filterMode === 'overdue' ? 'var(--primary)' : '#FFFFFF',
            boxShadow: '2px 2px 0px #000000',
            color: overdueLoansCount > 0 ? '#DC2626' : '#000000'
          }}
        >
          OVERDUE LOANS ({overdueLoansCount})
        </button>
      </div>

      {/* Loans List Table / Cards */}
      {filteredLoans.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          border: '3px dashed #000000',
          backgroundColor: '#FFFFFF'
        }}>
          <CheckCircle size={40} style={{ margin: '0 auto 1rem auto', color: '#9CA3AF' }} />
          <h3 style={{ margin: 0, fontSize: '1.4rem' }}>No loans found</h3>
          <p style={{ color: '#4B5563', marginTop: '0.25rem' }}>No records match the current filter selection.</p>
        </div>
      ) : (
        <div style={{
          border: 'var(--border-width) solid var(--border-color)',
          boxShadow: '4px 4px 0px #000000',
          overflowX: 'auto',
          backgroundColor: '#FFFFFF'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.9rem'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#FAF7F2',
                borderBottom: 'var(--border-width) solid var(--border-color)'
              }}>
                {user?.role === 'admin' && <th style={{ padding: '1rem', fontWeight: 800 }}>MEMBER</th>}
                <th style={{ padding: '1rem', fontWeight: 800 }}>BOOK TITLE</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>BORROWED DATE</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>DUE DATE</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>STATUS</th>
                <th style={{ padding: '1rem', fontWeight: 800 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map((loan) => {
                let statusBg = '#E5E7EB';
                let statusText = 'Returned';
                let statusColor = '#000000';
                
                if (loan.is_active) {
                  if (loan.is_overdue) {
                    statusBg = 'var(--accent)';
                    statusText = 'OVERDUE';
                    statusColor = '#DC2626';
                  } else {
                    statusBg = 'var(--primary)';
                    statusText = 'Active';
                  }
                }

                return (
                  <tr key={loan.id} style={{
                    borderBottom: '2px solid #E5E7EB'
                  }}>
                    {user?.role === 'admin' && (
                      <td style={{ padding: '1rem', fontWeight: 700 }}>
                        {loan.username}
                      </td>
                    )}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700 }}>{loan.book_title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>by {loan.book_author}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {new Date(loan.borrowed_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {new Date(loan.due_date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        backgroundColor: statusBg,
                        color: statusColor,
                        border: '1.5px solid #000000',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        boxShadow: '1px 1px 0px #000000',
                        textTransform: 'uppercase'
                      }}>
                        {statusText}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {loan.is_active ? (
                        <button
                          onClick={() => handleReturn(loan.id, loan.book_title)}
                          className="brut-btn"
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#86EFAC',
                            boxShadow: '1.5px 1.5px 0px #000000'
                          }}
                        >
                          {user?.role === 'admin' ? 'FORCE RETURN' : 'RETURN BOOK'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#6B7280', fontStyle: 'italic' }}>
                          Returned on {loan.returned_at ? new Date(loan.returned_at).toLocaleDateString() : 'N/A'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
