import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', rol: 'USER' });

  async function onLogin(event) {
    event.preventDefault();
    setError('');

    try {
      const user = await signIn(loginForm);
      navigate(user?.rol?.toUpperCase() === 'ADMIN' ? '/admin/dashboard' : '/');
    } catch (currentError) {
      setError(currentError.message || 'No se pudo iniciar sesión.');
    }
  }

  async function onRegister(event) {
    event.preventDefault();
    setError('');

    try {
      const user = await signUp(registerForm);
      navigate(user?.rol?.toUpperCase() === 'ADMIN' ? '/admin/dashboard' : '/');
    } catch (currentError) {
      setError(currentError.message || 'No se pudo registrar.');
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <Navbar />
      <main className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 sm:px-6">
        <div className="w-full rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-center text-2xl font-medium text-stone-950">¡BIENVENIDO!</h1>
          <p className="mt-2 text-center text-sm text-blue-600">Inicia sesión con tu cuenta.</p>

          {/* Google button */}
          <button type="button" className="mt-6 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm font-medium text-stone-900 hover:bg-stone-50">
            <svg className="mr-2 inline-block h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 border-t border-stone-300" />
            <span className="text-sm text-stone-500">o</span>
            <div className="flex-1 border-t border-stone-300" />
          </div>

          <form onSubmit={onLogin} className="mt-6 grid gap-4">
            <input
              type="email"
              value={loginForm.identifier}
              onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))}
              placeholder="Email"
              className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none placeholder:text-stone-400"
            />
            <div className="relative">
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Password"
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none placeholder:text-stone-400"
              />
              <button type="button" className="absolute right-4 top-3 text-stone-400 hover:text-stone-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <a href="#" className="text-sm text-stone-700 hover:text-stone-900">¿Olvidaste tu contraseña?</a>
            <button
              type="submit"
              className="mt-2 rounded-full bg-[#2a5a3a] px-6 py-3 text-sm font-medium uppercase tracking-[0.1em] text-white hover:bg-[#1f4a2a]"
            >
              Iniciar sesión
            </button>
          </form>

          {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>}

          <p className="mt-6 text-center text-sm text-stone-700">
            ¿Todavía no tienes una cuenta?{' '}
            <a href="#" onClick={() => setShowRegister(!showRegister)} className="font-medium text-stone-900 hover:text-stone-950 underline">
              Regístrate
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default AuthPage;
