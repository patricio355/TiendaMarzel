import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = ({ light = false }) => {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();

  const linkColor = light ? 'text-white/90 hover:text-white' : 'text-stone-700 hover:text-stone-950';
  const brandColor = light ? 'text-white' : 'text-stone-950';

  return (
    <nav className={`sticky top-0 z-50 border-b ${light ? 'border-white/15 bg-black/20' : 'border-stone-200/80 bg-[rgba(251,248,243,0.9)]'} backdrop-blur-xl`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-4xl font-medium tracking-tight sm:text-5xl">
          <span className={brandColor}>CaroCuore</span>
        </Link>

        <div className="hidden items-center gap-6 text-xs font-medium uppercase tracking-[0.3em] md:flex">
          <NavLink to="/" className={linkColor}>New In</NavLink>
          <NavLink to="/carrito" className={linkColor}>Carrito</NavLink>
          {!isAuthenticated ? <NavLink to="/auth" className={linkColor}>Login</NavLink> : null}
          {isAdmin ? <NavLink to="/admin/dashboard" className={linkColor}>Dashboard</NavLink> : null}
        </div>

        <div className="flex items-center gap-3">
          <Link to="/carrito" className={`rounded-full border ${light ? 'border-white/30 bg-white/10 text-white' : 'border-stone-300 bg-white text-stone-700'} px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em]`}>
            Carrito {cartCount}
          </Link>
          <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] sm:inline-flex ${light ? 'bg-white/20 text-white' : 'bg-stone-950 text-white'}`}>
            {user ? (user.username || user.email || 'Sesión activa') : 'Invitado'}
          </span>
          {user ? (
            <button
              type="button"
              onClick={logout}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${light ? 'border-white/30 text-white hover:border-white' : 'border-stone-300 text-stone-700 hover:border-stone-950 hover:text-stone-950'}`}
            >
              Salir
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;