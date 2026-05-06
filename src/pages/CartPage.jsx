import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { confirmOrder } from '../lib/api';
import { currency } from '../lib/shop';
import { getThumbnail } from '../lib/cloudinary';

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
    <div className="min-h-screen bg-white text-stone-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-light mb-6">Mi carrito</h1>

        <div className="grid grid-cols-12 gap-8">
          {/* Left: items list */}
          <div className="col-span-8">
            <div className="hidden md:grid grid-cols-12 gap-4 text-stone-500 border-b pb-4 mb-4">
              <div className="col-span-6">Producto</div>
              <div className="col-span-2 text-center">Precio</div>
              <div className="col-span-2 text-center">Cant.</div>
              <div className="col-span-2 text-right">total</div>
            </div>

            {cart.items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-stone-500">Tu carrito está vacío.</div>
            ) : (
              <div className="space-y-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
                    <div className="flex items-start gap-4 md:col-span-6">
                      <img src={getThumbnail(item.imagenUrl)} alt={item.nombre} className="h-20 w-20 object-cover rounded" />
                      <div>
                        <p className="text-lg font-medium">{item.nombre}</p>
                        {item.talle && <p className="text-sm text-stone-500">Talle: {item.talle}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-center md:gap-6 w-full md:w-auto">
                      <div className="text-sm text-stone-700 md:text-center md:w-32">{currency(item.precio)}</div>

                      <div className="flex items-center gap-3 border rounded-full px-3 py-1">
                        <button type="button" onClick={() => decrementItem(item)} className="px-2">-</button>
                        <div className="px-3">{item.cantidad}</div>
                        <button type="button" onClick={() => incrementItem(item)} className="px-2">+</button>
                      </div>

                      <div className="text-right md:w-32 font-medium">{currency((item.precio || 0) * (item.cantidad || 1))}</div>

                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => {/* edit variant if needed */}} className="text-stone-500">✎</button>
                        <button type="button" onClick={() => removeItem(item)} className="text-red-500">✕</button>
                      </div>
                    </div>
                  </div>
                ))}

                <div>
                  <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 text-sm text-stone-700">← Seguir comprando</button>
                </div>
              </div>
            )}
          </div>

          {/* Right: summary */}
          <aside className="col-span-4">
            <div className="rounded-3xl border border-stone-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-stone-500">¿Tenés cupón de descuento?</span>
                <button className="text-stone-400">▾</button>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl">Total</span>
                  <span className="text-xl font-medium">{currency(cartTotal)}</span>
                </div>

                <button onClick={onConfirm} className="w-full rounded-full bg-[#2a5a3a] text-white py-3 hover:bg-[#1f4a2a]">Completar compra</button>
              </div>

              {message && <p className="mt-4 text-sm text-stone-700">{message}</p>}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default CartPage;
