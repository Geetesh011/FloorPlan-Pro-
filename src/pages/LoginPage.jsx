import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoIcon from '../components/LogoIcon';

export default function LoginPage() {
  const { login, loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Incorrect email or password.'
          : err.code === 'auth/user-not-found'
          ? 'No account found with that email.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Login failed. Please try again.';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex font-sans bg-white">
      {/* Left side: Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-50 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-green-900/10 z-10 mix-blend-multiply"></div>
        <img 
          src="/living-room.png" 
          alt="FloorPlan Pro Interior" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 flex flex-col items-start justify-end h-full w-full p-16 pb-24 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
           <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
             Bring your interior <br /> ideas to life.
           </h2>
           <p className="text-lg text-gray-200 max-w-md">
             Join thousands of professionals and homeowners designing beautiful spaces with FloorPlan Pro.
           </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 relative">
        <div className="w-full max-w-md flex flex-col items-center sm:items-start text-center sm:text-left">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-12 hover:opacity-80 transition-opacity">
            <LogoIcon className="w-8 h-8 text-[#1bc650]" />
            <span className="font-bold text-2xl text-gray-900 tracking-tight">
              FloorPlan <span className="text-[#1bc650]">Pro</span>
            </span>
          </Link>

          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            Welcome back
          </h2>
          <p className="text-gray-500 mb-10 text-lg">
            Log in to your FloorPlan Pro account
          </p>

          {error && (
            <div className="w-full bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-6 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="w-full flex flex-col gap-3 mb-8">
            <button 
              onClick={handleGoogleLogin} 
              disabled={loading}
              className="flex items-center justify-center gap-3 w-full px-4 py-3.5 bg-[#18181b] hover:bg-black text-white rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:ring-2 hover:ring-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {!showEmailForm && (
              <button 
                onClick={() => setShowEmailForm(true)} 
                disabled={loading}
                className="flex items-center justify-center gap-3 w-full px-4 py-3.5 bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 rounded-xl font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-[#1bc650] hover:ring-2 hover:ring-[#1bc650]/30 hover:shadow-[0_0_15px_rgba(27,198,80,0.2)]"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Continue with email
              </button>
            )}
          </div>

          {showEmailForm && (
            <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-5 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col gap-2 text-left">
                <label className="text-sm font-medium text-gray-700" htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#1bc650] focus:border-[#1bc650] outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex flex-col gap-2 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700" htmlFor="password">Password</label>
                  <a href="#" className="text-sm font-medium text-[#1bc650] hover:text-[#1de25b] transition-colors">Forgot password?</a>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#1bc650] focus:border-[#1bc650] outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className={`w-full mt-2 px-4 py-3.5 bg-[#1bc650] text-black rounded-xl font-bold hover:bg-[#1de25b] transition-all duration-300 ${loading ? 'opacity-70' : 'hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(27,198,80,0.4)] hover:ring-2 hover:ring-[#1bc650]/50'}`}
              >
                {loading ? 'Signing in…' : 'Sign in with email'}
              </button>
            </form>
          )}

          <p className="mt-8 text-sm text-gray-500 text-center sm:text-left w-full">
            Don't have an account? <Link to="/" className="text-[#1bc650] font-semibold hover:underline">Sign up for free</Link>
          </p>

        </div>
      </div>
    </div>
  );
}
