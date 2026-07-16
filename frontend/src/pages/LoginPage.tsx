import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStore } from '../store';
import { authApi } from '../api';
import { BookOpen, UserPlus, LogIn } from 'lucide-react';

const authSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Alphanumeric and underscores only'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(50, 'Password cannot exceed 50 characters'),
  email: z.string().optional(),
  fullName: z.string().optional(),
  role: z.enum(['member', 'admin']),
  isLogin: z.boolean(),
}).refine((data) => {
  if (!data.isLogin) {
    return !!data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
  }
  return true;
}, {
  message: 'Invalid email address',
  path: ['email'],
});

type AuthFormValues = z.infer<typeof authSchema>;

export const LoginPage: React.FC = () => {
  const { login, showToast } = useStore();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: '',
      password: '',
      email: '',
      fullName: '',
      role: 'member',
      isLogin: true,
    },
  });

  const onSubmit = async (data: AuthFormValues) => {
    setLoading(true);
    try {
      if (data.isLogin) {
        await login(data.username, data.password);
        navigate('/');
      } else {
        // Register flow
        await authApi.register({
          username: data.username,
          email: data.email || '',
          full_name: data.fullName || undefined,
          password: data.password,
          role: data.role,
        });
        showToast('Registration successful! Please login.', 'success');
        setIsLogin(true); // Switch to login mode
        reset({
          username: data.username,
          password: '',
          email: '',
          fullName: '',
          role: 'member',
          isLogin: true,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div className="brut-card" style={{
        width: '450px',
        maxWidth: '100%',
        backgroundColor: 'var(--card-bg)',
        boxShadow: '8px 8px 0px var(--border-color)',
        color: 'var(--text-color)',
        padding: '2.5rem'
      }}>
        {/* Header Icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'var(--primary)',
            border: 'var(--border-width) solid var(--border-color)',
            padding: '1rem',
            borderRadius: '0%',
            transform: 'rotate(-4deg)',
            boxShadow: '4px 4px 0px var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={40} strokeWidth={2.5} />
          </div>
        </div>

        {/* Title */}
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--font-heading)',
          fontSize: '1.8rem',
          marginBottom: '1.5rem',
          textTransform: 'uppercase'
        }}>
          {isLogin ? 'LOG IN TO BIBLIOTECH' : 'CREATE ACCOUNT'}
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Hidden input to bind isLogin state to form data */}
          <input type="hidden" {...register('isLogin')} value={isLogin ? 'true' : 'false'} />

          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Username *
            </label>
            <input
              type="text"
              className="brut-input"
              {...register('username')}
              placeholder="e.g. libraryuser"
            />
            {errors.username && (
              <span style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.2rem', display: 'block' }}>
                {errors.username.message}
              </span>
            )}
          </div>

          {!isLogin && (
            <>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  className="brut-input"
                  {...register('email')}
                  placeholder="e.g. user@example.com"
                />
                {errors.email && (
                  <span style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.2rem', display: 'block' }}>
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="brut-input"
                  {...register('fullName')}
                  placeholder="e.g. John Doe"
                />
                {errors.fullName && (
                  <span style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.2rem', display: 'block' }}>
                    {errors.fullName.message}
                  </span>
                )}
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Password *
            </label>
            <input
              type="password"
              className="brut-input"
              {...register('password')}
              placeholder="••••••••"
            />
            {errors.password && (
              <span style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.2rem', display: 'block' }}>
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="brut-btn brut-btn-primary"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              justifyContent: 'center',
              width: '100%',
              padding: '0.9rem'
            }}
          >
            {loading ? 'PROCESSING...' : isLogin ? (
              <>
                SIGN IN <LogIn size={18} />
              </>
            ) : (
              <>
                REGISTER ACCOUNT <UserPlus size={18} />
              </>
            )}
          </button>

          {/* Toggle */}
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                const nextIsLogin = !isLogin;
                setIsLogin(nextIsLogin);
                reset({
                  username: '',
                  password: '',
                  email: '',
                  fullName: '',
                  role: 'member',
                  isLogin: nextIsLogin,
                });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-color)',
                opacity: 0.8,
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline'
              }}
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
