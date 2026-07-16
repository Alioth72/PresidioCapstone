import React, { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loansApi, authApi } from '../api';
import { useStore } from '../store';
import { RefreshCw, CheckCircle, Clock, ShieldAlert, ArrowLeftRight, Users, Shield, BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);


export const DashboardPage: React.FC = () => {
  const { user, showToast, theme } = useStore();
  const queryClient = useQueryClient();
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'overdue'>('all');
  const [activeTab, setActiveTab] = useState<'loans' | 'permissions' | 'analytics'>('loans');

  const { data: loans = [], isLoading, refetch } = useQuery({
    queryKey: ['loans', user?.role],
    queryFn: () => user?.role === 'admin' ? loansApi.listAll() : loansApi.listMy(),
    enabled: !!user,
  });

  const { data: users = [], isLoading: isUsersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => authApi.listUsers(),
    enabled: !!user && user.role === 'admin' && activeTab === 'permissions',
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'admin' | 'member' }) =>
      authApi.updateUserRole(userId, role),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast(`Role updated for user "${updatedUser.username}"!`, 'success');
    },
    onError: (err) => {
      let msg = 'Failed to update user role.';
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      }
      showToast(msg, 'error');
    }
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

  // ─── Analytics Computations ───
  const categoryCounts: Record<string, number> = {};
  loans.forEach((l) => {
    const cat = l.book_category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const textColor = theme === 'dark' ? '#F3F4F6' : '#000000';
  const gridColor = theme === 'dark' ? 'rgba(243, 244, 246, 0.15)' : 'rgba(0, 0, 0, 0.15)';

  const barChartData = {
    labels: Object.keys(categoryCounts),
    datasets: [
      {
        label: 'Number of Borrows',
        data: Object.values(categoryCounts),
        backgroundColor: '#FDE047', // var(--primary)
        borderColor: textColor,
        borderWidth: 2,
        borderRadius: 0,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: textColor,
          font: { family: 'Lexend, sans-serif', weight: 800, size: 12 },
        },
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Lexend, sans-serif', weight: 700 } },
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Lexend, sans-serif', weight: 700 }, stepSize: 1 },
      },
    },
  };

  const activeCount = loans.filter((l) => l.is_active && !l.is_overdue).length;
  const overdueCount = loans.filter((l) => l.is_active && l.is_overdue).length;
  const returnedCount = loans.filter((l) => !l.is_active).length;

  const doughnutChartData = {
    labels: ['Active Loans', 'Overdue Loans', 'Returned Loans'],
    datasets: [
      {
        data: [activeCount, overdueCount, returnedCount],
        backgroundColor: [
          '#FACC15', // Active
          '#F87171', // Overdue
          '#A78BFA', // Returned
        ],
        borderColor: textColor,
        borderWidth: 2,
      },
    ],
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: textColor,
          font: { family: 'Lexend, sans-serif', weight: 800, size: 12 },
        },
      },
    },
  };

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
          boxShadow: '2px 2px 0px var(--border-color)'
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
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontFamily: 'var(--font-heading)', color: 'var(--text-color)' }}>
            {user?.role === 'admin' ? 'ADMIN LOAN OVERSIGHT' : 'MY LIBRARY DASHBOARD'}
          </h1>
          <p style={{ color: 'var(--text-color)', opacity: 0.8, fontWeight: 500, marginTop: '0.25rem' }}>
            {user?.role === 'admin' 
              ? 'Monitor book checkouts, track due dates, and resolve member loans.' 
              : 'View your currently borrowed titles, due dates, and borrow history.'}
          </p>
        </div>

        <button
          onClick={() => activeTab === 'permissions' ? refetchUsers() : refetch()}
          className="brut-btn brut-btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
        >
          <RefreshCw size={16} /> REFRESH
        </button>
      </div>

      {user?.role === 'admin' && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '3px solid var(--border-color)',
          marginBottom: '2rem',
          paddingBottom: '0.5rem'
        }}>
          <button
            onClick={() => setActiveTab('loans')}
            className="brut-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              fontWeight: 800,
              backgroundColor: activeTab === 'loans' ? 'var(--primary)' : 'var(--card-bg)',
              boxShadow: activeTab === 'loans' ? '2px 2px 0px var(--border-color)' : 'none',
              color: activeTab === 'loans' ? '#000000' : 'var(--text-color)'
            }}
          >
            <ArrowLeftRight size={16} /> LOAN TRANSACTIONS
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className="brut-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              fontWeight: 800,
              backgroundColor: activeTab === 'permissions' ? 'var(--primary)' : 'var(--card-bg)',
              boxShadow: activeTab === 'permissions' ? '2px 2px 0px var(--border-color)' : 'none',
              color: activeTab === 'permissions' ? '#000000' : 'var(--text-color)'
            }}
          >
            <Users size={16} /> MANAGE PERMISSIONS
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className="brut-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              fontWeight: 800,
              backgroundColor: activeTab === 'analytics' ? 'var(--primary)' : 'var(--card-bg)',
              boxShadow: activeTab === 'analytics' ? '2px 2px 0px var(--border-color)' : 'none',
              color: activeTab === 'analytics' ? '#000000' : 'var(--text-color)'
            }}
          >
            <BarChart3 size={16} /> SYSTEM ANALYTICS
          </button>
        </div>
      )}

      {user?.role === 'admin' && activeTab === 'permissions' && (
        isUsersLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid var(--primary)',
              borderTopColor: 'transparent',
              animation: 'spin 1s linear infinite',
              boxShadow: '2px 2px 0px var(--border-color)'
            }} />
            <p style={{ marginTop: '1rem', fontWeight: 700, color: 'var(--text-color)' }}>LOADING USERS...</p>
          </div>
        ) : (
          <div style={{
            border: 'var(--border-width) solid var(--border-color)',
            boxShadow: '4px 4px 0px var(--border-color)',
            overflowX: 'auto',
            backgroundColor: 'var(--card-bg)'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.9rem',
              color: 'var(--text-color)'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--bg-color)',
                  borderBottom: 'var(--border-width) solid var(--border-color)'
                }}>
                  <th style={{ padding: '1rem', fontWeight: 800 }}>USERNAME</th>
                  <th style={{ padding: '1rem', fontWeight: 800 }}>FULL NAME</th>
                  <th style={{ padding: '1rem', fontWeight: 800 }}>EMAIL</th>
                  <th style={{ padding: '1rem', fontWeight: 800 }}>ROLE</th>
                  <th style={{ padding: '1rem', fontWeight: 800 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === user?.id;
                  return (
                    <tr key={u.id} style={{ borderBottom: '1.5px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', fontWeight: 700 }}>{u.username}</td>
                      <td style={{ padding: '1rem' }}>{u.full_name || 'N/A'}</td>
                      <td style={{ padding: '1rem' }}>{u.email}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          backgroundColor: u.role === 'admin' ? 'var(--accent)' : 'var(--primary)',
                          border: '1.5px solid var(--border-color)',
                          color: '#000000',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          boxShadow: '1px 1px 0px var(--border-color)',
                          textTransform: 'uppercase'
                        }}>
                          {u.role === 'admin' && <Shield size={12} />}
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {isSelf ? (
                          <span style={{ fontSize: '0.8rem', color: '#6B7280', fontStyle: 'italic' }}>
                            You (Logged In)
                          </span>
                        ) : (
                          <button
                            onClick={() => changeRoleMutation.mutate({
                              userId: u.id,
                              role: u.role === 'admin' ? 'member' : 'admin'
                            })}
                            disabled={changeRoleMutation.isPending}
                            className="brut-btn"
                            style={{
                              padding: '0.3rem 0.6rem',
                              fontSize: '0.75rem',
                              backgroundColor: u.role === 'admin' ? 'var(--accent)' : '#86EFAC',
                              boxShadow: '1.5px 1.5px 0px var(--border-color)',
                              cursor: changeRoleMutation.isPending ? 'not-allowed' : 'pointer',
                              color: '#000000'
                            }}
                          >
                            {u.role === 'admin' ? 'DEMOTE TO MEMBER' : 'PROMOTE TO ADMIN'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {user?.role === 'admin' && activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem'
          }}>
            <div className="brut-card" style={{ backgroundColor: 'var(--card-bg)', height: '400px', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--text-color)' }}>
                Borrows By Category
              </h2>
              <div style={{ flex: 1, position: 'relative' }}>
                {loans.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6B7280', fontWeight: 600 }}>No loan transactions found.</div>
                ) : (
                  <Bar data={barChartData} options={barChartOptions} />
                )}
              </div>
            </div>

            <div className="brut-card" style={{ backgroundColor: 'var(--card-bg)', height: '400px', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', marginBottom: '1rem', textTransform: 'uppercase', color: 'var(--text-color)' }}>
                Loan Status Distribution
              </h2>
              <div style={{ flex: 1, position: 'relative' }}>
                {loans.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#6B7280', fontWeight: 600 }}>No loan transactions found.</div>
                ) : (
                  <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {((user?.role !== 'admin') || (user?.role === 'admin' && activeTab === 'loans')) && (
        <>
          {/* Stats row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2.5rem'
          }}>
            {/* Total checkouts card */}
            <div className="brut-card" style={{ backgroundColor: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '1rem', color: '#000000' }}>
              <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #000000', padding: '0.75rem', display: 'flex' }}>
                <ArrowLeftRight size={24} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8 }}>Total Transactions</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 900 }}>{loans.length}</span>
              </div>
            </div>

            {/* Active checkouts card */}
            <div className="brut-card" style={{ backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '1rem', color: '#000000' }}>
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
              gap: '1rem',
              color: '#000000'
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

          {/* Filter Mode Buttons */}
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
                backgroundColor: filterMode === 'all' ? 'var(--primary)' : 'var(--card-bg)',
                boxShadow: '2px 2px 0px var(--border-color)',
                color: filterMode === 'all' ? '#000000' : 'var(--text-color)'
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
                backgroundColor: filterMode === 'active' ? 'var(--primary)' : 'var(--card-bg)',
                boxShadow: '2px 2px 0px var(--border-color)',
                color: filterMode === 'active' ? '#000000' : 'var(--text-color)'
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
                backgroundColor: filterMode === 'overdue' ? 'var(--primary)' : 'var(--card-bg)',
                boxShadow: '2px 2px 0px var(--border-color)',
                color: filterMode === 'overdue' ? '#000000' : (overdueLoansCount > 0 ? '#DC2626' : 'var(--text-color)')
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
              border: '3px dashed var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-color)'
            }}>
              <CheckCircle size={40} style={{ margin: '0 auto 1rem auto', color: '#9CA3AF' }} />
              <h3 style={{ margin: 0, fontSize: '1.4rem' }}>No loans found</h3>
              <p style={{ color: '#6B7280', marginTop: '0.25rem' }}>No records match the current filter selection.</p>
            </div>
          ) : (
            <div style={{
              border: 'var(--border-width) solid var(--border-color)',
              boxShadow: '4px 4px 0px var(--border-color)',
              overflowX: 'auto',
              backgroundColor: 'var(--card-bg)'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.9rem',
                color: 'var(--text-color)'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: 'var(--bg-color)',
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
                        borderBottom: '1.5px solid var(--border-color)'
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
                            border: '1.5px solid var(--border-color)',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            boxShadow: '1px 1px 0px var(--border-color)',
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
                                boxShadow: '1.5px 1.5px 0px var(--border-color)',
                                color: '#000000'
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
        </>
      )}
    </div>
  );
};
