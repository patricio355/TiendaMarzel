import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { currency } from '../lib/shop';
import { getThumbnail } from '../lib/cloudinary';

export default function CartDrawer({ isOpen, onClose }) {
  const { cart, cartTotal, incrementItem, decrementItem, removeItem } = useCart();

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <div className={`fixed inset-0 z-50 pointer-events-none ${isOpen ? '' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <aside className={`pointer-events-auto fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium">Mi carrito</h3>
          <button onClick={onClose} className="text-stone-500">✕</button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100% - 180px)' }}>
          {cart.items.length === 0 ? (
            <p className="text-sm text-stone-500">Tu carrito está vacío</p>
          ) : (
            <div className="space-y-6">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <img src={getThumbnail(item.imagenUrl)} alt={item.nombre} className="h-16 w-16 object-cover rounded" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{item.nombre}</p>
                      <p className="text-sm font-medium">{currency((item.precio || 0) * (item.cantidad || 1))}</p>
                    </div>
                    <div className="mt-1 flex gap-2 text-xs text-stone-600">
                      {item.talle && <p>Talle: <span className="font-medium">{item.talle}</span></p>}
                      {item.color && <p>Color: <span className="font-medium">{item.color}</span></p>}
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Precio unitario: {currency(item.precio || 0)}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => decrementItem(item)} className="px-2 rounded border text-xs">-</button>
                      <div className="px-3 text-sm">{item.cantidad}</div>
                      <button onClick={() => incrementItem(item)} className="px-2 rounded border text-xs">+</button>
                      <button onClick={() => removeItem(item)} className="ml-3 text-red-500 text-xs">Eliminar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-stone-500">Subtotal</span>
            <span className="text-lg font-medium">{currency(cartTotal)}</span>
          </div>

          <div className="flex gap-3">
            <Link to="/carrito" onClick={onClose} className="flex-1 rounded-full border px-4 py-3 text-center">Ir al carrito</Link>
            <button onClick={() => { /* could implement checkout */ }} className="flex-1 rounded-full bg-[#2a5a3a] text-white px-4 py-3 hover:bg-[#1f4a2a]">Completar compra</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
