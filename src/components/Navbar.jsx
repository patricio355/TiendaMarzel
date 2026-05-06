import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState } from 'react';
import CartDrawer from './CartDrawer';

export const Navbar = ({ light = false }) => {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const linkColor = light ? 'text-white/90 hover:text-white' : 'text-stone-700 hover:text-stone-950';
  const brandColor = light ? 'text-white' : 'text-stone-950';

  return (
    <>
      <nav className={`sticky top-0 z-50 border-b ${light ? 'border-white/15 bg-black/20' : 'border-stone-200/80 bg-[rgba(251,248,243,0.9)]'} backdrop-blur-xl`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center">
            <img src="/logomarzel.png" alt="MARZEL" className="h-12 w-auto sm:h-14" />
          </Link>

          <div className="hidden items-center gap-6 text-xs font-medium uppercase tracking-[0.3em] md:flex">
            <NavLink to="/" className={linkColor}>Novedades</NavLink>
            {!isAuthenticated ? <NavLink to="/auth" className={linkColor}>Login</NavLink> : null}
            {isAdmin ? <NavLink to="/admin/dashboard" className={linkColor}>Dashboard</NavLink> : null}
          </div>

          <div className="flex items-center gap-4">
            {/* Search icon */}
            <button aria-label="Buscar" title="Buscar" className={`p-3 rounded-full hover:bg-stone-100 ${light ? 'text-white hover:bg-white/20' : 'text-stone-700'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* User icon */}
            <Link to="/auth" aria-label="Cuenta" title="Cuenta" className={`p-3 rounded-full hover:bg-stone-100 ${light ? 'text-white hover:bg-white/20' : 'text-stone-700'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            {/* Cart icon (opens drawer) */}
            <button onClick={() => setDrawerOpen(true)} aria-label="Carrito" title="Carrito" className={`relative p-3 rounded-full hover:bg-stone-100 ${light ? 'text-white hover:bg-white/20' : 'text-stone-700'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M6 6h15l-1.5 9h-13L4 2H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="20" r="1" fill="currentColor" />
                <circle cx="18" cy="20" r="1" fill="currentColor" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-[#C4A747] px-1.5 py-0.5 text-[10px] text-white">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <CartDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

export default Navbar;