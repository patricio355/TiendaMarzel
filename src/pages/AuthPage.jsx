import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [error, setError] = useState('');
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
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <form onSubmit={onLogin} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Login</p>
          <h1 className="mt-2 text-4xl font-medium text-stone-950">Iniciar sesión</h1>
          <div className="mt-6 grid gap-3">
            <input value={loginForm.identifier} onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))} placeholder="Usuario o email" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
            <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} placeholder="Contraseña" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
            <button type="submit" className="rounded-2xl bg-stone-900 px-4 py-3 text-xs uppercase tracking-[0.28em] text-white">Entrar</button>
          </div>
        </form>

        <form onSubmit={onRegister} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Registro</p>
          <h2 className="mt-2 text-4xl font-medium text-stone-950">Crear cuenta</h2>
          <div className="mt-6 grid gap-3">
            <input value={registerForm.username} onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value }))} placeholder="Username" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
            <input value={registerForm.email} onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
            <input type="password" value={registerForm.password} onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))} placeholder="Contraseña" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
            <select value={registerForm.rol} onChange={(event) => setRegisterForm((current) => ({ ...current, rol: event.target.value }))} className="rounded-2xl border border-stone-300 px-4 py-3 outline-none">
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button type="submit" className="rounded-2xl bg-stone-900 px-4 py-3 text-xs uppercase tracking-[0.28em] text-white">Crear cuenta</button>
          </div>
        </form>

        {error ? <p className="lg:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      </main>
    </div>
  );
}

export default AuthPage;
