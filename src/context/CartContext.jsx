/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  addCartItem,
  clearCart,
  decrementCartItem,
  deleteCartItem,
  getCartBySession,
  getCartByUser,
  updateCartItem,
} from '../lib/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.content)) {
    return value.content;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

function normalizeCart(cart) {
  if (!cart) {
    return { id: null, items: [] };
  }

  return {
    id: cart.id ?? cart.carritoId ?? cart.cartId,
    items: toArray(cart.items ?? cart.carritoItems ?? cart.lineas ?? cart.detalles).map((item) => ({
      id: item.id ?? item.carritoItemId ?? item.itemId,
      cantidad: Number(item.cantidad ?? item.quantity ?? 0),
      nombre: item.nombre ?? item.productoNombre ?? item.productName ?? item.varianteNombre ?? 'Producto',
      precio: Number(item.precio ?? item.precioUnitario ?? item.price ?? item.subtotal ?? 0),
      varianteId: item.varianteId ?? item.variantId ?? null,
      talle: item.talle ?? null,
      color: item.color ?? null,
      imagenUrl: item.imagenUrl ?? item.imagen ?? item.image ?? null,
      raw: item,
    })),
  };
}

export function CartProvider({ children }) {
  const { user, token, sessionToken } = useAuth();
  const [cart, setCart] = useState({ id: null, items: [] });
  const [loading, setLoading] = useState(false);

  async function refreshCart() {
    if (!sessionToken && !user?.id) {
      return;
    }

    setLoading(true);
    try {
      const response = user?.id
        ? await getCartByUser(user.id, token)
        : await getCartBySession(sessionToken, token);
      setCart(normalizeCart(response));
    } catch {
      setCart({ id: null, items: [] });
    } finally {
      setLoading(false);
    }
  }

  async function addItem(varianteId, cantidad = 1) {
    await addCartItem({
      varianteId,
      cantidad,
      usuarioId: user?.id || undefined,
      sessionToken: user?.id ? undefined : sessionToken,
    }, token);
    await refreshCart();
  }

  async function incrementItem(item) {
    if (!item?.id) {
      return;
    }

    await updateCartItem(item.id, { cantidad: Number(item.cantidad) + 1 }, token);
    await refreshCart();
  }

  async function decrementItem(item) {
    if (!item?.id) {
      return;
    }

    await decrementCartItem(item.id, { cantidad: 1 }, token);
    await refreshCart();
  }

  async function removeItem(item) {
    if (!item?.id) {
      return;
    }

    await deleteCartItem(item.id, token);
    await refreshCart();
  }

  async function emptyCart() {
    if (!cart.id) {
      return;
    }

    await clearCart(cart.id, token);
    await refreshCart();
  }

  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    void refreshCart();
  }, [user?.id, token, sessionToken]);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/exhaustive-deps */
  const value = useMemo(() => ({
    cart,
    loading,
    cartCount: cart.items.reduce((sum, item) => sum + Number(item.cantidad), 0),
    cartTotal: cart.items.reduce((sum, item) => sum + (Number(item.precio) * Number(item.cantidad)), 0),
    refreshCart,
    addItem,
    incrementItem,
    decrementItem,
    removeItem,
    emptyCart,
  }), [cart, loading]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }

  return context;
}
