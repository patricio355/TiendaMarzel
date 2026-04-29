const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const errorMessage = payload?.message || payload?.error || text || `Error ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function listProducts() {
  return request('/api/productos');
}

export function listProductsByCategory(category) {
  return request(`/api/productos/categoria/${encodeURIComponent(category)}`);
}

export function getProduct(productId) {
  return request(`/api/productos/${encodeURIComponent(productId)}`);
}

export function createProduct(body, token) {
  return request('/api/productos', { method: 'POST', body, token });
}

export function updateProduct(productId, body, token) {
  return request(`/api/productos/${encodeURIComponent(productId)}`, { method: 'PUT', body, token });
}

export function deleteProduct(productId, token) {
  return request(`/api/productos/${encodeURIComponent(productId)}`, { method: 'DELETE', token });
}

export function register(body) {
  return request('/api/auth/registro', { method: 'POST', body });
}

export function login(body) {
  return request('/api/auth/login', { method: 'POST', body });
}

export function me(token) {
  return request('/api/auth/me', { token });
}

export function addCartItem(body, token) {
  return request('/api/carrito/agregar', { method: 'POST', body, token });
}

export function getCartByUser(userId, token) {
  return request(`/api/carrito/usuario/${encodeURIComponent(userId)}`, { token });
}

export function getCartBySession(sessionToken, token) {
  return request(`/api/carrito/sesion/${encodeURIComponent(sessionToken)}`, { token });
}

export function clearCart(cartId, token) {
  return request(`/api/carrito/${encodeURIComponent(cartId)}`, { method: 'DELETE', token });
}

export function updateCartItem(itemId, body, token) {
  return request(`/api/carrito/item/${encodeURIComponent(itemId)}`, { method: 'PATCH', body, token });
}

export function decrementCartItem(itemId, body, token) {
  return request(`/api/carrito/item/${encodeURIComponent(itemId)}/decrementar`, { method: 'PATCH', body, token });
}

export function deleteCartItem(itemId, token) {
  return request(`/api/carrito/item/${encodeURIComponent(itemId)}`, { method: 'DELETE', token });
}

export function confirmOrder(body, token) {
  return request('/api/pedidos/confirmar', { method: 'POST', body, token });
}

export function getOrderHistoryByUser(userId, token) {
  return request(`/api/pedidos/usuario/${encodeURIComponent(userId)}`, { token });
}

export function getOrderHistoryByEmail(email, token) {
  return request(`/api/pedidos/email/${encodeURIComponent(email)}`, { token });
}