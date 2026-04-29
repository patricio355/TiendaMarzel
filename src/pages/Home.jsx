import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import {
  addCartItem,
  clearCart,
  confirmOrder,
  createProduct,
  deleteCartItem,
  deleteProduct,
  decrementCartItem,
  getCartBySession,
  getCartByUser,
  getOrderHistoryByEmail,
  getOrderHistoryByUser,
  getProduct,
  listProducts,
  listProductsByCategory,
  login,
  me,
  register,
  updateCartItem,
  updateProduct,
} from '../lib/api';

const STORAGE_KEYS = {
  token: 'tienda.authToken',
  user: 'tienda.authUser',
  session: 'tienda.sessionToken',
};

const FALLBACK_PRODUCTS = [
  {
    id: 'demo-1',
    nombre: 'Silk Core Dress',
    descripcion: 'Pieza editorial para una tienda de moda con presencia fuerte y limpia.',
    precio: 84.9,
    categoria: 'Colección',
    imagenUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1200',
  },
  {
    id: 'demo-2',
    nombre: 'Linen Night Set',
    descripcion: 'Conjunto suave y ligero con lectura premium en catálogo.',
    precio: 61.5,
    categoria: 'Novedades',
    imagenUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1200',
  },
  {
    id: 'demo-3',
    nombre: 'Satin Body',
    descripcion: 'Producto de referencia para probar filtros, detalle y carrito.',
    precio: 49.0,
    categoria: 'Best Sellers',
    imagenUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200',
  },
];

function safeParse(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function currency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

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

function normalizeVariant(variant, index) {
  if (!variant) {
    return null;
  }

  return {
    id: variant.id ?? variant.varianteId ?? variant.variantId ?? `${index}`,
    nombre: variant.nombre ?? variant.name ?? variant.talle ?? variant.color ?? `Variante ${index + 1}`,
    stock: variant.stock ?? variant.disponible ?? variant.quantity ?? null,
    precio: variant.precio ?? variant.price ?? null,
    raw: variant,
  };
}

function normalizeProduct(product) {
  if (!product) {
    return null;
  }

  const variants = toArray(product.variantes ?? product.variants)
    .map((variant, index) => normalizeVariant(variant, index))
    .filter(Boolean);
  const images = toArray(product.imagenes ?? product.images ?? product.galeria);

  return {
    id: product.id ?? product.productoId ?? product.productId,
    nombre: product.nombre ?? product.name ?? product.titulo ?? 'Producto sin nombre',
    descripcion: product.descripcion ?? product.description ?? '',
    precio: product.precio ?? product.price ?? 0,
    categoria: product.categoria ?? product.category ?? 'General',
    imagenUrl: product.imagenUrl ?? product.imagen ?? product.image ?? images[0] ?? FALLBACK_PRODUCTS[0].imagenUrl,
    images,
    variants,
    tag: product.tag ?? product.etiqueta ?? null,
    raw: product,
  };
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? user.usuarioId ?? user.userId,
    username: user.username ?? user.nombre ?? user.name ?? null,
    email: user.email ?? null,
    rol: user.rol ?? user.role ?? null,
    raw: user,
  };
}

function normalizeAuthResponse(response) {
  const user = normalizeUser(response?.usuario ?? response?.user ?? response?.account ?? response);
  const token = response?.token ?? response?.jwt ?? response?.accessToken ?? null;
  return { user, token };
}

function normalizeCart(cart) {
  if (!cart) {
    return { id: null, items: [], raw: null };
  }

  const items = toArray(cart.items ?? cart.carritoItems ?? cart.lineas ?? cart.detalles).map((item) => ({
    id: item.id ?? item.carritoItemId ?? item.itemId,
    cantidad: item.cantidad ?? item.quantity ?? 0,
    nombre: item.nombre ?? item.productoNombre ?? item.productName ?? item.varianteNombre ?? 'Artículo',
    precio: item.precio ?? item.price ?? item.subtotal ?? 0,
    varianteId: item.varianteId ?? item.variantId ?? null,
    raw: item,
  }));

  return {
    id: cart.id ?? cart.carritoId ?? cart.cartId,
    usuarioId: cart.usuarioId ?? cart.userId ?? null,
    sessionToken: cart.sessionToken ?? null,
    items,
    raw: cart,
  };
}

function Home() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [cart, setCart] = useState({ id: null, items: [], raw: null });
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState('');
  const [message, setMessage] = useState('');
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', rol: 'USER' });
  const [orderEmail, setOrderEmail] = useState('');
  const [orderHistory, setOrderHistory] = useState([]);
  const [adminForm, setAdminForm] = useState({ id: '', nombre: '', descripcion: '', precio: '', categoria: '', imagenUrl: '' });
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [viewMode, setViewMode] = useState('store');

  const isAdminUser = authUser?.rol?.toUpperCase() === 'ADMIN';

  const categories = useMemo(() => ['Todos', ...new Set(products.map((product) => product.categoria).filter(Boolean))], [products]);
  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = category === 'Todos' || product.categoria === category;
      const matchesSearch = !normalizedSearch || [product.nombre, product.descripcion, product.categoria]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesCategory && matchesSearch;
    });
  }, [category, products, search]);
  const cartCount = useMemo(() => cart.items.reduce((total, item) => total + Number(item.cantidad ?? 0), 0), [cart.items]);
  const selectedProductVariants = selectedProduct?.variants ?? [];

  async function loadCatalog(nextCategory = category) {
    setCatalogLoading(true);
    setCatalogError('');

    try {
      const response = nextCategory !== 'Todos'
        ? await listProductsByCategory(nextCategory)
        : await listProducts();
      const normalized = toArray(response).map(normalizeProduct).filter(Boolean);
      setProducts(normalized.length > 0 ? normalized : FALLBACK_PRODUCTS.map(normalizeProduct));
    } catch (error) {
      setCatalogError(error.message || 'No se pudieron cargar los productos.');
      setProducts(FALLBACK_PRODUCTS.map(normalizeProduct));
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadDetail(productId) {
    if (!productId) {
      return;
    }

    setDetailLoading(true);

    try {
      const response = await getProduct(productId);
      const normalized = normalizeProduct(response);
      setSelectedProduct(normalized);
      setSelectedVariantId(normalized.variants[0]?.id ?? null);
      setAdminForm({
        id: normalized.id ?? '',
        nombre: normalized.nombre ?? '',
        descripcion: normalized.descripcion ?? '',
        precio: normalized.precio ?? '',
        categoria: normalized.categoria ?? '',
        imagenUrl: normalized.imagenUrl ?? '',
      });
    } catch (error) {
      setMessage(error.message || 'No se pudo cargar el detalle del producto.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadCartState(nextUser = authUser, nextToken = authToken, nextSessionToken = sessionToken) {
    setCartLoading(true);
    setCartError('');

    try {
      const response = nextUser?.id
        ? await getCartByUser(nextUser.id, nextToken)
        : await getCartBySession(nextSessionToken, nextToken);
      setCart(normalizeCart(response));
    } catch (error) {
      setCartError(error.message || 'No se pudo cargar el carrito.');
      setCart({ id: null, items: [], raw: null });
    } finally {
      setCartLoading(false);
    }
  }

  async function loadOrderHistory(nextUser = authUser, email = orderEmail, token = authToken) {
    if (!nextUser?.id && !email.trim()) {
      setOrderHistory([]);
      return;
    }

    setOrdersLoading(true);

    try {
      const response = nextUser?.id
        ? await getOrderHistoryByUser(nextUser.id, token)
        : await getOrderHistoryByEmail(email.trim(), token);
      setOrderHistory(toArray(response));
    } catch (error) {
      setMessage(error.message || 'No se pudo cargar el historial de pedidos.');
      setOrderHistory([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function handleAuthSubmit(kind) {
    const payload = kind === 'login' ? loginForm : registerForm;

    try {
      const response = kind === 'login'
        ? await login(payload)
        : await register(payload);
      const normalized = normalizeAuthResponse(response);

      if (normalized.token) {
        setAuthToken(normalized.token);
        window.localStorage.setItem(STORAGE_KEYS.token, normalized.token);
      }

      if (normalized.user) {
        setAuthUser(normalized.user);
        window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalized.user.raw ?? normalized.user));
      }

      setViewMode(normalized.user?.rol?.toUpperCase() === 'ADMIN' ? 'dashboard' : 'store');

      setMessage(kind === 'login' ? 'Sesión iniciada correctamente.' : 'Registro completado correctamente.');
      await Promise.all([
        loadCartState(normalized.user, normalized.token || authToken, sessionToken),
        loadOrderHistory(normalized.user, orderEmail, normalized.token || authToken),
      ]);
    } catch (error) {
      setMessage(error.message || 'No se pudo completar la autenticación.');
    }
  }

  async function handleProductSubmit(event) {
    event.preventDefault();
    setSubmittingProduct(true);

    const payload = {
      nombre: adminForm.nombre,
      descripcion: adminForm.descripcion,
      precio: Number(adminForm.precio),
      categoria: adminForm.categoria,
      imagenUrl: adminForm.imagenUrl,
    };

    try {
      if (adminForm.id) {
        await updateProduct(adminForm.id, payload, authToken);
        setMessage('Producto actualizado.');
      } else {
        await createProduct(payload, authToken);
        setMessage('Producto creado.');
      }

      await loadCatalog(category);
    } catch (error) {
      setMessage(error.message || 'No se pudo guardar el producto.');
    } finally {
      setSubmittingProduct(false);
    }
  }

  async function handleDeleteProduct(productId) {
    if (!productId) {
      return;
    }

    try {
      await deleteProduct(productId, authToken);
      setMessage('Producto eliminado.');
      await loadCatalog(category);
      if (selectedProduct?.id === productId) {
        setSelectedProduct(null);
        setSelectedVariantId(null);
      }
    } catch (error) {
      setMessage(error.message || 'No se pudo eliminar el producto.');
    }
  }

  async function handleAddToCart(product, variantOverrideId) {
    const variantId = variantOverrideId || selectedVariantId || product.variants[0]?.id || product.id;

    if (!variantId) {
      setMessage('Este producto no tiene una variante seleccionable.');
      return;
    }

    try {
      await addCartItem({
        varianteId: variantId,
        cantidad: 1,
        usuarioId: authUser?.id || undefined,
        sessionToken: authUser?.id ? undefined : sessionToken,
      }, authToken);

      setMessage('Producto agregado al carrito.');
      await loadCartState();
    } catch (error) {
      setMessage(error.message || 'No se pudo agregar el producto al carrito.');
    }
  }

  async function handleIncrementItem(item) {
    try {
      if (item.id) {
        await updateCartItem(item.id, { cantidad: Number(item.cantidad ?? 0) + 1 }, authToken);
      }
      await loadCartState();
    } catch (error) {
      setMessage(error.message || 'No se pudo actualizar el carrito.');
    }
  }

  async function handleDecrementItem(item) {
    try {
      if (item.id) {
        await decrementCartItem(item.id, { cantidad: 1 }, authToken);
      }
      await loadCartState();
    } catch (error) {
      setMessage(error.message || 'No se pudo decrementar el item.');
    }
  }

  async function handleRemoveItem(item) {
    try {
      if (item.id) {
        await deleteCartItem(item.id, authToken);
      }
      await loadCartState();
    } catch (error) {
      setMessage(error.message || 'No se pudo eliminar el item.');
    }
  }

  async function handleClearCart() {
    try {
      if (cart.id) {
        await clearCart(cart.id, authToken);
      }
      await loadCartState();
      setMessage('Carrito vaciado.');
    } catch (error) {
      setMessage(error.message || 'No se pudo vaciar el carrito.');
    }
  }

  async function handleConfirmOrder() {
    if (!cart.id) {
      setMessage('El carrito está vacío o todavía no tiene identificador.');
      return;
    }

    const emailContacto = orderEmail.trim() || authUser?.email || loginForm.identifier || registerForm.email;

    if (!emailContacto) {
      setMessage('Ingresa un correo de contacto para confirmar el pedido.');
      return;
    }

    try {
      await confirmOrder({ carritoId: cart.id, emailContacto }, authToken);
      setMessage('Pedido confirmado.');
      await Promise.all([
        loadOrderHistory(authUser, emailContacto, authToken),
        loadCartState(),
      ]);
    } catch (error) {
      setMessage(error.message || 'No se pudo confirmar el pedido.');
    }
  }

  function handleLogout() {
    setAuthUser(null);
    setAuthToken('');
    setCart({ id: null, items: [], raw: null });
    setViewMode('store');
    window.localStorage.removeItem(STORAGE_KEYS.token);
    window.localStorage.removeItem(STORAGE_KEYS.user);
    setMessage('Sesión cerrada.');
    loadCartState(null, '', sessionToken);
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    let isMounted = true;

    void (async () => {
      let nextSessionToken = window.localStorage.getItem(STORAGE_KEYS.session);

      if (!nextSessionToken) {
        nextSessionToken = typeof crypto !== 'undefined' && crypto.randomUUID
          ? `session_${crypto.randomUUID()}`
          : `session_${Date.now()}`;
        window.localStorage.setItem(STORAGE_KEYS.session, nextSessionToken);
      }

      const storedToken = window.localStorage.getItem(STORAGE_KEYS.token) || '';
      const storedUser = safeParse(window.localStorage.getItem(STORAGE_KEYS.user), null);

      if (!isMounted) {
        return;
      }

      setSessionToken(nextSessionToken);
      setAuthToken(storedToken);
      setAuthUser(normalizeUser(storedUser));
      setViewMode(normalizeUser(storedUser)?.rol?.toUpperCase() === 'ADMIN' ? 'dashboard' : 'store');

      await loadCatalog('Todos');

      if (storedToken) {
        try {
          const response = await me(storedToken);
          const normalizedUser = normalizeUser(response);

          if (!isMounted) {
            return;
          }

          setAuthUser(normalizedUser);
          setViewMode(normalizedUser.rol?.toUpperCase() === 'ADMIN' ? 'dashboard' : 'store');
          window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalizedUser?.raw ?? response));
          await Promise.all([
            loadCartState(normalizedUser, storedToken, nextSessionToken),
            loadOrderHistory(normalizedUser, orderEmail, storedToken),
          ]);
        } catch {
          await loadCartState(normalizeUser(storedUser), storedToken, nextSessionToken);
        }
      } else {
        await loadCartState(normalizeUser(storedUser), '', nextSessionToken);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const cartTotal = useMemo(() => cart.items.reduce((total, item) => total + Number(item.precio ?? 0) * Number(item.cantidad ?? 0), 0), [cart.items]);

  if (isAdminUser && viewMode === 'dashboard') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffaf2_0%,_#f2ebe0_45%,_#e7ded0_100%)] text-stone-900">
        <Navbar cartCount={cartCount} user={authUser} onLogout={handleLogout} />

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <section className="rounded-[2rem] border border-white/70 bg-stone-950 p-8 text-white shadow-[0_30px_100px_rgba(31,24,17,0.32)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400">Dashboard administrador</p>
                <h2 className="mt-3 font-serif text-5xl leading-none tracking-tight sm:text-6xl">Bienvenido, {authUser?.username || authUser?.email || 'admin'}.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-300">Tu sesión abrió el panel de administración. Desde aquí puedes volver a la tienda, editar productos y revisar pedidos.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('store')}
                  className="rounded-full bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.3em] text-stone-950 transition hover:bg-stone-200"
                >
                  Ver tienda
                </button>
                <button
                  type="button"
                  onClick={() => loadCatalog('Todos')}
                  className="rounded-full border border-white/20 px-5 py-3 text-xs font-bold uppercase tracking-[0.3em] text-white transition hover:border-white hover:bg-white/5"
                >
                  Refrescar
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Productos', products.length],
                ['Pedidos', orderHistory.length],
                ['Carrito', cart.items.length],
                ['Sesión', authToken ? 'Activa' : 'Sin token'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400">{label}</p>
                  <p className="mt-2 font-serif text-3xl text-white">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_25px_60px_rgba(72,61,45,0.08)] backdrop-blur">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Gestión</p>
                  <h3 className="mt-2 font-serif text-3xl text-stone-950">Productos</h3>
                </div>
                <span className="text-xs uppercase tracking-[0.3em] text-stone-500">{filteredProducts.length} visibles</span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(product);
                      setAdminForm({
                        id: product.id ?? '',
                        nombre: product.nombre ?? '',
                        descripcion: product.descripcion ?? '',
                        precio: product.precio ?? '',
                        categoria: product.categoria ?? '',
                        imagenUrl: product.imagenUrl ?? '',
                      });
                    }}
                    className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white text-left transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(72,61,45,0.12)]"
                  >
                    <img src={product.imagenUrl} alt={product.nombre} className="h-44 w-full object-cover" />
                    <div className="p-4">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">{product.categoria}</p>
                      <p className="mt-2 font-serif text-xl text-stone-950">{product.nombre}</p>
                      <p className="mt-2 text-sm text-stone-600">{currency(product.precio)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_25px_60px_rgba(72,61,45,0.08)] backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Producto</p>
                <h3 className="mt-2 font-serif text-3xl text-stone-950">Editar o crear</h3>
                <form onSubmit={handleProductSubmit} className="mt-5 grid gap-4">
                  <input value={adminForm.id} onChange={(event) => setAdminForm((current) => ({ ...current, id: event.target.value }))} placeholder="ID (vacío para crear)" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400" />
                  <input value={adminForm.nombre} onChange={(event) => setAdminForm((current) => ({ ...current, nombre: event.target.value }))} placeholder="Nombre" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400" />
                  <input value={adminForm.categoria} onChange={(event) => setAdminForm((current) => ({ ...current, categoria: event.target.value }))} placeholder="Categoría" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400" />
                  <input value={adminForm.precio} onChange={(event) => setAdminForm((current) => ({ ...current, precio: event.target.value }))} placeholder="Precio" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400" />
                  <input value={adminForm.imagenUrl} onChange={(event) => setAdminForm((current) => ({ ...current, imagenUrl: event.target.value }))} placeholder="Imagen URL" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400" />
                  <textarea value={adminForm.descripcion} onChange={(event) => setAdminForm((current) => ({ ...current, descripcion: event.target.value }))} placeholder="Descripción" rows="4" className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400" />
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" disabled={submittingProduct} className="rounded-full bg-stone-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">{submittingProduct ? 'Guardando...' : 'Guardar'}</button>
                    <button type="button" onClick={() => selectedProduct && handleDeleteProduct(selectedProduct.id)} className="rounded-full border border-stone-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-stone-700 transition hover:border-red-500 hover:text-red-700">Eliminar</button>
                    <button type="button" onClick={() => setAdminForm({ id: '', nombre: '', descripcion: '', precio: '', categoria: '', imagenUrl: '' })} className="rounded-full border border-stone-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-stone-700 transition hover:border-stone-950 hover:text-stone-950">Limpiar</button>
                  </div>
                </form>
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_25px_60px_rgba(72,61,45,0.08)] backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Pedidos</p>
                <h3 className="mt-2 font-serif text-3xl text-stone-950">Resumen reciente</h3>
                <div className="mt-4 space-y-3">
                  {orderHistory.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">No hay pedidos cargados todavía.</p>
                  ) : orderHistory.slice(0, 3).map((order, index) => (
                    <div key={order.id ?? order.pedidoId ?? index} className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
                      <p className="font-medium text-stone-950">Pedido #{order.id ?? order.pedidoId ?? index + 1}</p>
                      <p className="mt-1">{order.estado ?? order.status ?? 'Sin estado'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffaf2_0%,_#f2ebe0_45%,_#e7ded0_100%)] text-stone-900">
      <Navbar cartCount={cartCount} user={authUser} onLogout={handleLogout} />

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-14">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-stone-600 shadow-sm backdrop-blur">
              Backend conectado
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>

            <div className="space-y-5">
              <p className="text-[11px] uppercase tracking-[0.5em] text-stone-500">Catálogo, carrito, auth, pedidos y CRUD</p>
              <h2 className="max-w-3xl font-serif text-5xl leading-none tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
                Una tienda completa conectada a tu API.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
                Productos desde /api/productos, detalle por ID, sesión de usuario, carrito por invitado o usuario, confirmación de pedidos y administración de productos desde el mismo frontend.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="#catalogo" className="rounded-full bg-stone-950 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-stone-800">
                Ver catálogo
              </a>
              <a href="#auth" className="rounded-full border border-stone-300 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-stone-700 transition hover:border-stone-950 hover:text-stone-950">
                Iniciar sesión
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Productos', products.length],
                ['Carrito', cartCount],
                ['Pedidos', orderHistory.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_20px_60px_rgba(72,61,45,0.08)] backdrop-blur">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">{label}</p>
                  <p className="mt-2 font-serif text-3xl text-stone-950">{value}</p>
                </div>
              ))}
            </div>

            {message ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {message}
              </div>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-stone-950 p-6 text-white shadow-[0_30px_100px_rgba(31,24,17,0.32)]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400">Estado de sesión</p>
                <p className="mt-2 text-lg font-medium">{authUser ? (authUser.username || authUser.email || 'Usuario autenticado') : 'Modo invitado'}</p>
              </div>
              <div className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.35em] text-stone-300">
                {authToken ? 'Token activo' : 'Sin token'}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400">Carrito actual</p>
                <p className="mt-2 font-serif text-3xl">{cart.items.length}</p>
                <p className="mt-1 text-sm text-stone-300">{cartLoading ? 'Cargando...' : 'Ítems sincronizados con la API'}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400">Base URL</p>
                <p className="mt-2 font-serif text-lg">http://localhost:8080</p>
                <p className="mt-1 text-sm text-stone-300">Ajusta VITE_API_URL si usas otro puerto.</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-stone-300">
              <p className="font-medium text-white">Cobertura funcional</p>
              <p className="mt-2 leading-6">Catálogo, detalle, filtro por categoría, login, registro, carrito, confirmación de pedido e interfaz de gestión de productos.</p>
            </div>
          </div>
        </section>

        <section id="catalogo" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="flex flex-col gap-5 rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_30px_80px_rgba(72,61,45,0.08)] backdrop-blur lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Catálogo</p>
              <h3 className="mt-2 font-serif text-3xl text-stone-950 sm:text-4xl">Productos del backend</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[52%]">
              <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
                <span>Buscar</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nombre, categoría o descripción"
                  className="w-full bg-transparent text-stone-900 outline-none placeholder:text-stone-400"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
                <span>Categoría</span>
                <select
                  value={category}
                  onChange={(event) => {
                    const nextCategory = event.target.value;
                    setCategory(nextCategory);
                    loadCatalog(nextCategory);
                  }}
                  className="w-full bg-transparent text-stone-900 outline-none"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {catalogError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {catalogError}
            </div>
          ) : null}

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              {catalogLoading ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-[420px] animate-pulse rounded-[1.75rem] bg-white/80" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <article key={product.id} className="group overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_25px_60px_rgba(72,61,45,0.08)] transition hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(72,61,45,0.14)]">
                      <button type="button" onClick={() => { setSelectedProduct(product); setSelectedVariantId(product.variants[0]?.id ?? null); loadDetail(product.id); }} className="block w-full text-left">
                        <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                          <img
                            src={product.imagenUrl}
                            alt={product.nombre}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-700">
                              {product.categoria}
                            </span>
                            {product.tag ? (
                              <span className="rounded-full bg-stone-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white">
                                {product.tag}
                              </span>
                            ) : null}
                          </div>
                          <div className="absolute inset-x-4 bottom-4 flex gap-2 opacity-0 transition group-hover:opacity-100">
                            <span className="rounded-full bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-700">
                              Ver detalle
                            </span>
                          </div>
                        </div>
                      </button>
                      <div className="space-y-4 p-5">
                        <div>
                          <h4 className="font-serif text-2xl text-stone-950">{product.nombre}</h4>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{product.descripcion}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-lg font-semibold text-stone-950">{currency(product.precio)}</p>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product, product.variants[0]?.id ?? product.id)}
                            className="rounded-full border border-stone-200 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-[1.75rem] border border-white/70 bg-stone-950 p-6 text-white shadow-[0_25px_60px_rgba(31,24,17,0.22)]">
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400">Detalle</p>
                {detailLoading ? (
                  <div className="mt-5 space-y-4">
                    <div className="h-72 animate-pulse rounded-3xl bg-white/10" />
                    <div className="h-5 animate-pulse rounded bg-white/10" />
                    <div className="h-4 animate-pulse rounded bg-white/10" />
                  </div>
                ) : selectedProduct ? (
                  <div className="mt-5 space-y-5">
                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                      <img src={selectedProduct.imagenUrl} alt={selectedProduct.nombre} className="h-72 w-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-serif text-3xl text-white">{selectedProduct.nombre}</h4>
                      <p className="mt-2 text-sm leading-6 text-stone-300">{selectedProduct.descripcion}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-stone-200">{selectedProduct.categoria}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-stone-200">{currency(selectedProduct.precio)}</span>
                    </div>

                    {selectedProductVariants.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400">Variantes</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedProductVariants.map((variant) => (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => setSelectedVariantId(variant.id)}
                              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${selectedVariantId === variant.id ? 'border-white bg-white text-stone-950' : 'border-white/20 bg-white/5 text-white hover:border-white/60'}`}
                            >
                              {variant.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(selectedProduct, selectedVariantId || selectedProduct.variants[0]?.id || selectedProduct.id)}
                        className="flex-1 rounded-full bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-stone-950 transition hover:bg-stone-200"
                      >
                        Añadir al carrito
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminForm({
                          id: selectedProduct.id ?? '',
                          nombre: selectedProduct.nombre ?? '',
                          descripcion: selectedProduct.descripcion ?? '',
                          precio: selectedProduct.precio ?? '',
                          categoria: selectedProduct.categoria ?? '',
                          imagenUrl: selectedProduct.imagenUrl ?? '',
                        })}
                        className="rounded-full border border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-white transition hover:border-white hover:bg-white/5"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-stone-300">Selecciona un producto para ver su detalle, variantes y acciones directas.</p>
                )}
              </div>

              <div id="carrito" className="rounded-[1.75rem] border border-white/70 bg-white/70 p-6 shadow-[0_25px_60px_rgba(72,61,45,0.08)] backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Carrito</p>
                    <h4 className="mt-2 font-serif text-2xl text-stone-950">Resumen actual</h4>
                  </div>
                  <span className="rounded-full bg-stone-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white">{cartCount}</span>
                </div>

                {cartError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{cartError}</div>
                ) : null}

                <div className="mt-5 space-y-3">
                  {cart.items.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">
                      El carrito está vacío. Agrega un producto desde el catálogo o detalle.
                    </p>
                  ) : cart.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-stone-950">{item.nombre}</p>
                          <p className="mt-1 text-sm text-stone-500">{currency(item.precio)}</p>
                        </div>
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-stone-600">
                          x{item.cantidad}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleDecrementItem(item)} className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950">-1</button>
                        <button type="button" onClick={() => handleIncrementItem(item)} className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950">+1</button>
                        <button type="button" onClick={() => handleRemoveItem(item)} className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950">Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex gap-3">
                  <input
                    value={orderEmail}
                    onChange={(event) => setOrderEmail(event.target.value)}
                    placeholder="Email de contacto"
                    className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    className="rounded-2xl bg-stone-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-white transition hover:bg-stone-800"
                  >
                    Confirmar
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-stone-500">
                  <span>Estimado</span>
                  <span>{currency(cartTotal)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleClearCart}
                  className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                >
                  Vaciar carrito
                </button>
              </div>
            </aside>
          </div>
        </section>

        <section id="auth" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={(event) => { event.preventDefault(); handleAuthSubmit('login'); }}
              className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_25px_60px_rgba(72,61,45,0.08)] backdrop-blur"
            >
              <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Auth</p>
              <h3 className="mt-2 font-serif text-3xl text-stone-950">Iniciar sesión</h3>
              <div className="mt-6 grid gap-4">
                <input
                  value={loginForm.identifier}
                  onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))}
                  placeholder="Usuario o email"
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400"
                />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Contraseña"
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400"
                />
                <button type="submit" className="rounded-2xl bg-stone-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-white transition hover:bg-stone-800">Entrar</button>
              </div>
            </form>

            <form
              onSubmit={(event) => { event.preventDefault(); handleAuthSubmit('register'); }}
              className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_25px_60px_rgba(72,61,45,0.08)] backdrop-blur"
            >
              <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Nuevo usuario</p>
              <h3 className="mt-2 font-serif text-3xl text-stone-950">Registro</h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <input
                  value={registerForm.username}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="Username"
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400"
                />
                <input
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Email"
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400"
                />
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Contraseña"
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400"
                />
                <select
                  value={registerForm.rol}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, rol: event.target.value }))}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <button type="submit" className="mt-4 rounded-2xl bg-stone-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-white transition hover:bg-stone-800">Crear cuenta</button>
            </form>
          </div>
        </section>

        <section id="pedidos" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] border border-white/70 bg-stone-950 p-6 text-white shadow-[0_25px_60px_rgba(31,24,17,0.22)]">
              <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400">Pedidos</p>
              <h3 className="mt-2 font-serif text-3xl">Historial</h3>
              <p className="mt-3 text-sm leading-6 text-stone-300">Consulta por usuario autenticado o por email de contacto. La vista carga el historial que expone la API y te permite validar el flujo completo de compra.</p>
              <button
                type="button"
                onClick={() => loadOrderHistory(authUser, orderEmail, authToken)}
                className="mt-5 rounded-full bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-stone-950 transition hover:bg-stone-200"
              >
                Refrescar historial
              </button>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_25px_60px_rgba(72,61,45,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Pedidos</p>
                  <h4 className="mt-2 font-serif text-2xl text-stone-950">Resultados</h4>
                </div>
                <span className="text-xs uppercase tracking-[0.3em] text-stone-500">{ordersLoading ? 'Cargando...' : `${orderHistory.length} registros`}</span>
              </div>

              <div className="mt-5 space-y-3">
                {orderHistory.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-6 text-sm text-stone-500">
                    Aún no hay pedidos cargados. Inicia sesión o escribe un email de contacto para consultar.
                  </p>
                ) : orderHistory.map((order, index) => (
                  <div key={order.id ?? order.pedidoId ?? index} className="rounded-2xl border border-stone-200 bg-white p-4">
                    <p className="font-medium text-stone-950">Pedido #{order.id ?? order.pedidoId ?? index + 1}</p>
                    <p className="mt-1 text-sm text-stone-500">{order.estado ?? order.status ?? 'Sin estado'} · {order.total ? currency(order.total) : 'Total no disponible'}</p>
                    <pre className="mt-3 overflow-auto rounded-2xl bg-stone-950 p-3 text-[11px] leading-5 text-stone-200">{JSON.stringify(order, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_25px_60px_rgba(72,61,45,0.08)] backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">Administración</p>
                <h3 className="mt-2 font-serif text-3xl text-stone-950">Crear, editar o borrar productos</h3>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-stone-600">Este bloque usa los endpoints POST, PUT y DELETE de productos. Puedes cargar un producto desde el detalle, modificarlo y volver a sincronizar el catálogo.</p>
            </div>

            <form onSubmit={handleProductSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
              <input
                value={adminForm.id}
                onChange={(event) => setAdminForm((current) => ({ ...current, id: event.target.value }))}
                placeholder="ID (deja vacío para crear)"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400 lg:col-span-2"
              />
              <input
                value={adminForm.nombre}
                onChange={(event) => setAdminForm((current) => ({ ...current, nombre: event.target.value }))}
                placeholder="Nombre"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400"
              />
              <input
                value={adminForm.categoria}
                onChange={(event) => setAdminForm((current) => ({ ...current, categoria: event.target.value }))}
                placeholder="Categoría"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400"
              />
              <input
                value={adminForm.precio}
                onChange={(event) => setAdminForm((current) => ({ ...current, precio: event.target.value }))}
                placeholder="Precio"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400"
              />
              <input
                value={adminForm.imagenUrl}
                onChange={(event) => setAdminForm((current) => ({ ...current, imagenUrl: event.target.value }))}
                placeholder="Imagen URL"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400"
              />
              <textarea
                value={adminForm.descripcion}
                onChange={(event) => setAdminForm((current) => ({ ...current, descripcion: event.target.value }))}
                placeholder="Descripción"
                rows="4"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-stone-400 lg:col-span-2"
              />
              <div className="flex flex-wrap gap-3 lg:col-span-2">
                <button type="submit" disabled={submittingProduct} className="rounded-full bg-stone-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {submittingProduct ? 'Guardando...' : 'Guardar producto'}
                </button>
                <button
                  type="button"
                  onClick={() => selectedProduct && handleDeleteProduct(selectedProduct.id)}
                  className="rounded-full border border-stone-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-stone-700 transition hover:border-red-500 hover:text-red-700"
                >
                  Eliminar seleccionado
                </button>
                <button
                  type="button"
                  onClick={() => setAdminForm({ id: '', nombre: '', descripcion: '', precio: '', categoria: '', imagenUrl: '' })}
                  className="rounded-full border border-stone-300 px-4 py-3 text-xs font-bold uppercase tracking-[0.3em] text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                >
                  Limpiar
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
