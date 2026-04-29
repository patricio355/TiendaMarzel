import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { confirmOrder } from '../lib/api';
import { currency } from '../lib/shop';

function CartPage() {
  const { user, token } = useAuth();
  const { cart, cartTotal, incrementItem, decrementItem, removeItem, emptyCart, refreshCart } = useCart();
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');

  async function onConfirm() {
    if (!cart.id) {
      setMessage('No hay carrito para confirmar.');
      return;
    }

    const emailContacto = email.trim() || user?.email;
    if (!emailContacto) {
      setMessage('Ingresa un email de contacto.');
      return;
    }

    try {
      await confirmOrder({ carritoId: cart.id, emailContacto }, token);
      setMessage('Pedido confirmado correctamente.');
      await refreshCart();
    } catch (error) {
      setMessage(error.message || 'No se pudo confirmar el pedido.');
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-medium text-stone-950">Carrito</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.25em] text-stone-500">Resumen de compra</p>

        <div className="mt-8 space-y-3">
          {cart.items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-500">Tu carrito está vacío.</div>
          ) : cart.items.map((item) => (
            <div key={item.id} className="rounded-3xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-medium text-stone-950">{item.nombre}</p>
                  <p className="text-sm text-stone-500">{currency(item.precio)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => decrementItem(item)} className="rounded-full border border-stone-300 px-3 py-1">-</button>
                  <span className="min-w-8 text-center">{item.cantidad}</span>
                  <button type="button" onClick={() => incrementItem(item)} className="rounded-full border border-stone-300 px-3 py-1">+</button>
                  <button type="button" onClick={() => removeItem(item)} className="rounded-full border border-stone-300 px-3 py-1">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between text-sm uppercase tracking-[0.2em] text-stone-600">
            <span>Total</span>
            <span>{currency(cartTotal)}</span>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email de contacto" className="flex-1 rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
            <button type="button" onClick={onConfirm} className="rounded-2xl bg-stone-900 px-5 py-3 text-xs uppercase tracking-[0.25em] text-white">Confirmar pedido</button>
            <button type="button" onClick={emptyCart} className="rounded-2xl border border-stone-300 px-5 py-3 text-xs uppercase tracking-[0.25em] text-stone-700">Vaciar</button>
          </div>

          {message ? <p className="mt-4 text-sm text-stone-700">{message}</p> : null}
        </div>
      </main>
    </div>
  );
}

export default CartPage;
