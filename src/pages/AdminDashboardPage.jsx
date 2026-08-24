import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  addCartItem,
  clearCart,
  confirmOrder,
  createProduct,
  createIngreso,
  getCartBySession,
  getOrderHistoryByEmail,
  getOrderHistoryByUser,
  listIngresos,
  listProducts,
  listStock,
  listStockSummary,
} from '../lib/api';
import { currency, normalizeProduct, toArray } from '../lib/shop';
import { getThumbnail } from '../lib/cloudinary';

const INGRESO_EMPTY = {
  productoNombre: '',
  productoId: '',
  imagenUrl: '',
  categoria: 'General',
  precioVenta: '',
  sizeType: 'talle', // 'talle' | 'numero'
  talle: '',
  numero: '',
  color: '',
  cantidad: '',
  costo: '',
  proveedor: '',
  nota: '',
};

const INGRESO_FILTERS_EMPTY = {
  page: 0,
  size: 20,
  productoId: '',
  proveedor: '',
  fechaDesde: '',
  fechaHasta: '',
};

const TAB_ITEMS = [
  { id: 'stock', label: 'Stock' },
  { id: 'ingresos', label: 'Ingresos' },
  { id: 'ventas', label: 'Ventas' },
];

const SALE_SESSION_KEY = 'tienda.saleSessionToken';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLookup(value) {
  return String(value ?? '').trim().toLowerCase();
}

function formatSizeLabel(talle, numero) {
  if (talle && String(talle).trim()) return talle;
  if (numero !== null && numero !== undefined && String(numero).trim() !== '') return `Nro ${numero}`;
  return 'Único';
}

function formatDateTime(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getOrCreateSaleSessionToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  let token = window.localStorage.getItem(SALE_SESSION_KEY);
  if (!token) {
    token = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `sale_${crypto.randomUUID()}`
      : `sale_${Date.now()}`;
    window.localStorage.setItem(SALE_SESSION_KEY, token);
  }

  return token;
}

function normalizeStockRow(row, index) {
  if (!row) return null;

  const product = row.producto ?? row.product ?? {};
  const variant = row.variante ?? row.variant ?? {};

  return {
    id: row.id ?? row.varianteId ?? row.variantId ?? `${index}`,
    productoId: row.productoId ?? row.productId ?? product.id ?? null,
    productoNombre: row.productoNombre ?? product.nombre ?? product.name ?? 'Producto',
    talle: row.talle ?? variant.talle ?? null,
    numero: row.numero ?? variant.numero ?? null,
    color: row.color ?? variant.color ?? null,
    stock: toNumber(row.stock),
    reserved: toNumber(row.reserved ?? row.reservado),
    lastCost: row.lastCost ?? row.ultimoCosto ?? null,
  };
}

function flattenProductStock(products) {
  return products.flatMap((product) => (product.variants ?? []).map((variant, index) => ({
    id: variant.id ?? variant.varianteId ?? variant.variantId ?? `${product.id}-${index}`,
    productoId: product.id ?? null,
    productoNombre: product.nombre ?? 'Producto',
    talle: variant.talle ?? null,
    numero: variant.numero ?? null,
    color: variant.color ?? null,
    stock: toNumber(variant.stock),
    reserved: toNumber(variant.reserved ?? 0),
    lastCost: toNumber(variant.lastCost ?? 0, null),
  })));
}

function buildStockSummary(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const key = String(row.productoId ?? row.productoNombre);
    const current = grouped.get(key) ?? {
      id: key,
      productoId: row.productoId ?? null,
      productoNombre: row.productoNombre ?? 'Producto',
      totalStock: 0,
      totalReserved: 0,
    };

    current.totalStock += toNumber(row.stock);
    current.totalReserved += toNumber(row.reserved);
    grouped.set(key, current);
  });

  return Array.from(grouped.values());
}

function normalizeIngresoRow(row, index) {
  if (!row) return null;

  const variant = row.productoVariante ?? row.variante ?? row.variant ?? {};
  const product = row.producto ?? variant.producto ?? variant.product ?? {};

  return {
    id: row.id ?? row.ingresoId ?? `${index}`,
    fecha: row.fecha ?? row.createdAt ?? row.fechaCreacion ?? null,
    productoId: row.productoId ?? variant.productoId ?? product.id ?? null,
    productoVarianteId: row.productoVarianteId ?? variant.id ?? variant.varianteId ?? null,
    productoNombre: row.productoNombre ?? product.nombre ?? variant.productoNombre ?? variant.nombre ?? 'Producto',
    talle: row.talle ?? variant.talle ?? null,
    numero: row.numero ?? variant.numero ?? null,
    color: row.color ?? variant.color ?? null,
    cantidad: toNumber(row.cantidad),
    costo: row.costo ?? row.price ?? row.lastCost ?? null,
    proveedor: row.proveedor ?? '',
    nota: row.nota ?? '',
  };
}

function normalizeSaleRow(row, index) {
  if (!row) return null;

  const items = toArray(row.items ?? row.detalles ?? row.lineas ?? row.productos);

  return {
    id: row.id ?? row.pedidoId ?? `${index}`,
    fecha: row.fecha ?? row.createdAt ?? row.fechaCreacion ?? null,
    estado: row.estado ?? row.status ?? 'Sin estado',
    total: toNumber(row.total),
    itemsCount: items.length,
  };
}

function normalizePage(response) {
  const items = toArray(response);

  return {
    items,
    page: toNumber(response?.number ?? response?.page ?? response?.pageable?.pageNumber),
    size: toNumber(response?.size ?? response?.pageable?.pageSize, items.length),
    totalPages: toNumber(response?.totalPages),
    totalElements: toNumber(response?.totalElements, items.length),
  };
}

function StatCard({ label, value, note }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-[0_18px_55px_rgba(77,61,41,0.08)] backdrop-blur">
      <p className="text-[10px] uppercase tracking-[0.4em] text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-stone-950">{value}</p>
      {note ? <p className="mt-2 text-sm leading-5 text-stone-500">{note}</p> : null}
    </div>
  );
}

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.45em] text-stone-500">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold text-stone-950">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-5 py-8 text-center">
      <p className="text-sm font-medium text-stone-950">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-stone-500">{description}</p> : null}
    </div>
  );
}

function AdminDashboardPage() {
  const { user, token, sessionToken } = useAuth();
  const [selectedTab, setSelectedTab] = useState('stock');
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [products, setProducts] = useState([]);
  const [stockRows, setStockRows] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [ingresosPage, setIngresosPage] = useState({ page: 0, size: 20, totalPages: 0, totalElements: 0 });
  const [sales, setSales] = useState([]);
  const [message, setMessage] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [ingresoForm, setIngresoForm] = useState(INGRESO_EMPTY);
  const [ingresoFilters, setIngresoFilters] = useState(INGRESO_FILTERS_EMPTY);
  const [saleSearch, setSaleSearch] = useState('');
  const [saleEmail, setSaleEmail] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleItems, setSaleItems] = useState([]);
  const [selectedSaleVariantId, setSelectedSaleVariantId] = useState('');
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [loadingIngresos, setLoadingIngresos] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [saleSessionToken] = useState(() => getOrCreateSaleSessionToken());

  const productById = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);

  const productByName = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      const key = normalizeLookup(product.nombre);
      if (key && !map.has(key)) {
        map.set(key, product);
      }
    });
    return map;
  }, [products]);

  const variantById = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      (product.variants ?? []).forEach((variant) => {
        map.set(String(variant.id), { product, variant });
      });
    });
    return map;
  }, [products]);

  const availableSaleVariants = useMemo(() => {
    const query = saleSearch.trim().toLowerCase();
    const sourceRows = stockRows.length > 0 ? stockRows : flattenProductStock(products);

    return sourceRows
      .map((row) => {
        const match = variantById.get(String(row.id)) || (row.productoId ? { product: productById.get(String(row.productoId)), variant: null } : null);
        const product = match?.product;
        const variant = match?.variant;

        return {
          variantId: String(row.id),
          productName: row.productoNombre ?? product?.nombre ?? 'Producto',
          talle: row.talle ?? variant?.talle ?? null,
          numero: row.numero ?? variant?.numero ?? null,
          color: row.color ?? variant?.color ?? null,
          stock: row.stock,
          reserved: row.reserved,
          salePrice: toNumber(variant?.precio ?? product?.precio),
          imageUrl: product?.imagenUrl ?? null,
        };
      })
      .filter((row) => row.stock > 0)
      .filter((row) => {
        if (!query) return true;
        const text = [row.productName, row.talle, row.numero ? `nro ${row.numero}` : '', row.color, row.stock, row.salePrice].filter(Boolean).join(' ').toLowerCase();
        return text.includes(query);
      });
  }, [productById, products, saleSearch, stockRows, variantById]);

  const groupedStock = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();
    const groups = new Map();

    stockRows.forEach((row) => {
      const matchText = [row.productoNombre, row.talle, row.numero ? `nro ${row.numero}` : '', row.color, row.stock, row.reserved, row.lastCost].filter(Boolean).join(' ').toLowerCase();
      if (query && !matchText.includes(query)) {
        return;
      }

      const key = String(row.productoId ?? row.productoNombre);
      const current = groups.get(key) ?? {
        productoId: row.productoId,
        productoNombre: row.productoNombre,
        totalStock: 0,
        totalReserved: 0,
        variants: [],
      };

      current.totalStock += toNumber(row.stock);
      current.totalReserved += toNumber(row.reserved);
      current.variants.push(row);
      groups.set(key, current);
    });

    return Array.from(groups.values());
  }, [stockRows, stockSearch]);

  function toggleProductExpand(productKey) {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productKey)) {
        next.delete(productKey);
      } else {
        next.add(productKey);
      }
      return next;
    });
  }

  const isCreatingNewProduct = ingresoForm.productoId === '__new__';

  const ingresoSelectedProduct = useMemo(() => {
    if (ingresoForm.productoId && !isCreatingNewProduct) {
      return productById.get(String(ingresoForm.productoId)) ?? null;
    }

    if (ingresoForm.productoNombre && !isCreatingNewProduct) {
      return productByName.get(normalizeLookup(ingresoForm.productoNombre)) ?? null;
    }

    return null;
  }, [ingresoForm.productoId, ingresoForm.productoNombre, isCreatingNewProduct, productById, productByName]);

  const ingresoSizeVariants = useMemo(() => {
    if (!ingresoSelectedProduct) {
      return [];
    }

    const talle = ingresoForm.sizeType === 'talle' ? ingresoForm.talle.trim() : '';
    const numero = ingresoForm.sizeType === 'numero' ? ingresoForm.numero.trim() : '';

    return (ingresoSelectedProduct.variants ?? []).filter((variant) => {
      const matchesTalle = !talle || normalizeLookup(variant.talle) === normalizeLookup(talle);
      const matchesNumero = !numero || String(variant.numero ?? '') === numero;
      return matchesTalle && matchesNumero;
    });
  }, [ingresoForm.numero, ingresoForm.sizeType, ingresoForm.talle, ingresoSelectedProduct]);

  const ingresoColorOptions = useMemo(() => {
    const colors = ingresoSizeVariants
      .map((variant) => String(variant.color ?? '').trim())
      .filter(Boolean);

    return Array.from(new Set(colors));
  }, [ingresoSizeVariants]);

  const ingresoSelectedVariant = useMemo(() => {
    if (!ingresoSelectedProduct) {
      return null;
    }

    const talle = ingresoForm.sizeType === 'talle' ? ingresoForm.talle.trim() : '';
    const numero = ingresoForm.sizeType === 'numero' ? ingresoForm.numero.trim() : '';
    const color = ingresoForm.color.trim();

    return (ingresoSelectedProduct.variants ?? []).find((variant) => {
      const matchesTalle = !talle || normalizeLookup(variant.talle) === normalizeLookup(talle);
      const matchesNumero = !numero || String(variant.numero ?? '') === numero;
      const matchesColor = !color || normalizeLookup(variant.color) === normalizeLookup(color);
      return matchesTalle && matchesNumero && matchesColor;
    }) ?? null;
  }, [ingresoForm.color, ingresoForm.numero, ingresoForm.sizeType, ingresoForm.talle, ingresoSelectedProduct]);

  const ingresoSelectedVariantStock = ingresoSelectedVariant
    ? toNumber(ingresoSelectedVariant.stock)
    : 0;

  const totalStock = useMemo(() => stockRows.reduce((sum, row) => sum + toNumber(row.stock), 0), [stockRows]);
  const totalReserved = useMemo(() => stockRows.reduce((sum, row) => sum + toNumber(row.reserved), 0), [stockRows]);
  const totalIngresosAmount = useMemo(
    () => ingresos.reduce((sum, ingreso) => sum + toNumber(ingreso.cantidad) * toNumber(ingreso.costo), 0),
    [ingresos],
  );
  const totalSalesAmount = useMemo(
    () => sales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
    [sales],
  );
  const stockLowCount = useMemo(() => stockRows.filter((row) => row.stock > 0 && row.stock <= 3).length, [stockRows]);

  function loadProducts() {
    return listProducts().then((response) => {
      setProducts(toArray(response).map(normalizeProduct).filter(Boolean));
    });
  }

  function loadStock() {
    const productFallbackRows = flattenProductStock(products);

    return Promise.all([listStock(token), listStockSummary(token)])
      .then(([stockResponse, summaryResponse]) => {
        const nextStockRows = toArray(stockResponse).map(normalizeStockRow).filter(Boolean);
        const resolvedStockRows = nextStockRows.length > 0 ? nextStockRows : productFallbackRows;

        setStockRows(resolvedStockRows);

        const nextSummaryRows = toArray(summaryResponse).map((row, index) => ({
          id: row?.id ?? row?.productoId ?? `${index}`,
          productoNombre: row?.productoNombre ?? row?.nombre ?? 'Producto',
          totalStock: toNumber(row?.totalStock),
          totalReserved: toNumber(row?.totalReserved),
        })).filter(Boolean);

        setStockSummary(nextSummaryRows.length > 0 ? nextSummaryRows : buildStockSummary(resolvedStockRows));
      })
      .catch(() => {
        setStockRows(productFallbackRows);
        setStockSummary(buildStockSummary(productFallbackRows));
      });
  }

  function loadIngresosData(nextFilters = ingresoFilters) {
    setLoadingIngresos(true);
    return listIngresos(nextFilters, token)
      .then((response) => {
        const page = normalizePage(response);
        setIngresos(page.items.map(normalizeIngresoRow).filter(Boolean));
        setIngresosPage({
          page: page.page,
          size: page.size,
          totalPages: page.totalPages,
          totalElements: page.totalElements,
        });
      })
      .catch((error) => {
        setMessage(error.message || 'No se pudieron cargar los ingresos.');
        setIngresos([]);
      })
      .finally(() => setLoadingIngresos(false));
  }

  function loadSalesData(nextEmail = saleEmail) {
    setLoadingSales(true);
    const email = nextEmail.trim();

    const request = email
      ? getOrderHistoryByEmail(email, token)
      : user?.id
        ? getOrderHistoryByUser(user.id, token)
        : Promise.resolve([]);

    return request
      .then((response) => {
        setSales(toArray(response).map(normalizeSaleRow).filter(Boolean));
      })
      .catch((error) => {
        setMessage(error.message || 'No se pudieron cargar las ventas.');
        setSales([]);
      })
      .finally(() => setLoadingSales(false));
  }

  function loadDashboard() {
    setLoadingDashboard(true);
    return Promise.all([
      loadProducts(),
      loadStock(),
      loadIngresosData(INGRESO_FILTERS_EMPTY),
      loadSalesData(user?.email || ''),
    ])
      .catch((error) => {
        setMessage(error.message || 'No se pudo cargar el dashboard.');
      })
      .finally(() => setLoadingDashboard(false));
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.email) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      setSaleEmail((current) => current || user.email);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [user?.email]);

  async function onIngresoSubmit(event) {
    event.preventDefault();

    const productoNombre = ingresoForm.productoNombre.trim();
    const talle = ingresoForm.sizeType === 'talle' ? ingresoForm.talle.trim() : '';
    const numero = ingresoForm.sizeType === 'numero' ? ingresoForm.numero.trim() : '';
    const color = ingresoForm.color.trim();

    if (!productoNombre || !ingresoForm.cantidad || !ingresoForm.costo) {
      setMessage('Completá nombre de producto, cantidad y costo.');
      return;
    }

    if (!talle && numero === '') {
      setMessage(`Completá el ${ingresoForm.sizeType} para identificar la variante.`);
      return;
    }

    try {
      let productoId = ingresoForm.productoId.trim();

      if (productoId === '__new__') {
        productoId = '';
      }

      if (!productoId) {
        const existingProduct = productByName.get(normalizeLookup(productoNombre));
        productoId = String(existingProduct?.id ?? '');
      }

      if (!productoId) {
        const createdProduct = await createProduct({
          nombre: productoNombre,
          descripcion: '',
          precio: Number(ingresoForm.precioVenta || 0),
          categoria: ingresoForm.categoria.trim() || 'General',
          imagenUrl: ingresoForm.imagenUrl.trim() || '',
        }, token);

        productoId = String(createdProduct?.id ?? createdProduct?.productoId ?? createdProduct?.data?.id ?? '');
      }

      if (!productoId) {
        throw new Error('No se pudo resolver el producto para el ingreso.');
      }

      await createIngreso(
        {
          productoId,
          ...(talle ? { talle } : {}),
          ...(numero !== '' ? { numero: Number(numero) } : {}),
          ...(color ? { color } : {}),
          cantidad: Number(ingresoForm.cantidad),
          costo: Number(ingresoForm.costo),
          proveedor: ingresoForm.proveedor.trim(),
          nota: ingresoForm.nota.trim(),
        },
        token,
      );

      setIngresoForm(INGRESO_EMPTY);
      setMessage('Ingreso registrado y stock actualizado con éxito.');
      await Promise.all([
        loadStock(),
        loadProducts(),
        loadIngresosData({ ...ingresoFilters, page: 0 }),
      ]);
    } catch (error) {
      setMessage(error.message || 'No se pudo registrar el ingreso.');
    }
  }

  function addSaleItem(variant) {
    const quantity = Math.max(1, Math.floor(Number(saleQuantity) || 1));
    if (!variant?.variantId) {
      return;
    }

    setSaleItems((current) => {
      const existing = current.find((item) => item.variantId === variant.variantId);
      if (existing) {
        return current.map((item) => (
          item.variantId === variant.variantId
            ? { ...item, quantity: Math.min(item.quantity + quantity, variant.stock) }
            : item
        ));
      }

      return [...current, { ...variant, quantity: Math.min(quantity, variant.stock) }];
    });

    setSelectedSaleVariantId(variant.variantId);
  }

  function removeSaleItem(variantId) {
    setSaleItems((current) => current.filter((item) => item.variantId !== variantId));
  }

  async function onRegisterSale(event) {
    event.preventDefault();

    if (!saleItems.length) {
      setMessage('Agregá al menos un producto a la venta.');
      return;
    }

    const emailContacto = saleEmail.trim() || user?.email || '';
    if (!emailContacto) {
      setMessage('Ingresá un email de contacto para registrar la venta.');
      return;
    }

    setSaleSubmitting(true);
    setMessage('');

    try {
      const saleToken = saleSessionToken || sessionToken;
      if (!saleToken) {
        throw new Error('No se pudo crear la venta.');
      }

      let existingCart = null;
      try {
        existingCart = await getCartBySession(saleToken, token);
      } catch {
        existingCart = null;
      }

      const cartId = existingCart?.id ?? existingCart?.carritoId ?? existingCart?.cartId;

      if (cartId) {
        await clearCart(cartId, token);
      }

      for (const item of saleItems) {
        await addCartItem({
          varianteId: item.variantId,
          cantidad: item.quantity,
          sessionToken: saleToken,
        }, token);
      }

      const cart = await getCartBySession(saleToken, token);
      const nextCartId = cart?.id ?? cart?.carritoId ?? cart?.cartId;

      if (!nextCartId) {
        throw new Error('No se pudo obtener el carrito de venta.');
      }

      await confirmOrder({ carritoId: nextCartId, emailContacto }, token);

      setSaleItems([]);
      setSaleQuantity(1);
      setSelectedSaleVariantId('');
      setMessage('Venta registrada y stock actualizado.');

      await Promise.all([
        loadStock(),
        loadProducts(),
        loadSalesData(emailContacto),
      ]);
    } catch (error) {
      setMessage(error.message || 'No se pudo registrar la venta.');
    } finally {
      setSaleSubmitting(false);
    }
  }

  const pendingSaleTotal = useMemo(
    () => saleItems.reduce((sum, item) => sum + toNumber(item.salePrice) * toNumber(item.quantity), 0),
    [saleItems],
  );

  const pendingSaleQuantity = useMemo(
    () => saleItems.reduce((sum, item) => sum + toNumber(item.quantity), 0),
    [saleItems],
  );

  const recentIngresosCount = ingresosPage.totalElements || ingresos.length;
  const currentPhotoPreview = isCreatingNewProduct ? ingresoForm.imagenUrl : ingresoSelectedProduct?.imagenUrl;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ec_0%,_#f3e6d4_44%,_#e7dac5_100%)] text-stone-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/80 bg-white/70 p-6 shadow-[0_30px_100px_rgba(82,61,34,0.08)] backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.45em] text-stone-500">Panel de administración</p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-5xl font-semibold tracking-tight text-stone-950 sm:text-6xl">Dashboard</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
                Stock, ingresos y ventas en una vista simple. Las ventas se registran desde el panel y el stock se actualiza con el flujo del backend.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Productos" value={products.length} note="Catálogo cargado" />
            <StatCard label="Variantes" value={stockRows.length} note="Inventario disponible" />
            <StatCard label="Stock total" value={totalStock} note={`Reservado: ${totalReserved}`} />
            <StatCard label="Ingresos" value={recentIngresosCount} note={`Monto: ${currency(totalIngresosAmount)}`} />
            <StatCard label="Ventas" value={sales.length} note={`Total: ${currency(totalSalesAmount)}`} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-b border-stone-200 pb-4">
            {TAB_ITEMS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] transition ${selectedTab === tab.id ? 'bg-stone-950 text-white shadow-lg shadow-stone-950/15' : 'border border-stone-300 bg-white text-stone-600 hover:border-stone-500 hover:text-stone-950'}`}
              >
                {tab.label}
              </button>
            ))}
            <div className="ml-auto text-xs uppercase tracking-[0.3em] text-stone-500">
              {loadingDashboard ? 'Sincronizando...' : 'Listo'}
            </div>
          </div>

          {/* TAB STOCK */}
          {selectedTab === 'stock' ? (
            <section className="mt-8 rounded-[1.5rem] border border-stone-200 bg-white p-6">
              <SectionHeader
                eyebrow="Stock"
                title="Inventario por Producto"
                description="Hacé clic en cualquier producto para desplegar sus variantes, talles o números y stock disponible."
                action={(
                  <button type="button" onClick={() => void loadStock()} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-stone-600 transition hover:border-stone-500 hover:text-stone-950">
                    Refrescar stock
                  </button>
                )}
              />

              <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_0.6fr]">
                <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                  <span>Buscar</span>
                  <input
                    value={stockSearch}
                    onChange={(event) => setStockSearch(event.target.value)}
                    placeholder="Producto, talle, número, color o stock"
                    className="w-full bg-transparent text-stone-900 outline-none placeholder:text-stone-400"
                  />
                </label>
                <div className="flex items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                  Productos agrupados. Tocá una fila para ver variantes.
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-stone-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Producto</th>
                      <th className="px-4 py-3 font-medium">Variantes</th>
                      <th className="px-4 py-3 font-medium">Stock Total</th>
                      <th className="px-4 py-3 font-medium">Reservado</th>
                      <th className="px-4 py-3 font-medium">Disponible</th>
                      <th className="px-4 py-3 text-right font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedStock.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6">
                          <EmptyState title="No hay variantes para mostrar" description="Probá limpiando la búsqueda o refrescando el stock." />
                        </td>
                      </tr>
                    ) : groupedStock.map((group) => {
                      const groupKey = String(group.productoId ?? group.productoNombre);
                      const isExpanded = expandedProducts.has(groupKey);
                      const product = productById.get(String(group.productoId));
                      const totalAvailable = group.totalStock - group.totalReserved;

                      return (
                        <tr key={groupKey} className="group/row border-t border-stone-200">
                          <td colSpan={6} className="p-0">
                            <div
                              onClick={() => toggleProductExpand(groupKey)}
                              className="flex cursor-pointer items-center justify-between px-4 py-3.5 transition hover:bg-stone-50/80"
                            >
                              <div className="flex min-w-[240px] items-center gap-3">
                                {product?.imagenUrl ? (
                                  <img src={getThumbnail(product.imagenUrl)} alt={group.productoNombre} className="h-10 w-10 rounded object-cover" />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded bg-stone-100 text-[10px] text-stone-400">Sin foto</div>
                                )}
                                <div>
                                  <p className="font-semibold text-stone-900">{group.productoNombre}</p>
                                  <p className="text-xs text-stone-500">{group.variants.length} {group.variants.length === 1 ? 'variante' : 'variantes'}</p>
                                </div>
                              </div>

                              <div className="grid flex-1 grid-cols-4 items-center px-4 text-center">
                                <span className="text-xs font-semibold text-stone-600">{group.variants.length} tipo(s)</span>
                                <span className="font-medium text-stone-900">{group.totalStock}</span>
                                <span className="text-stone-500">{group.totalReserved}</span>
                                <span className="font-semibold text-emerald-700">{totalAvailable}</span>
                              </div>

                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-600">
                                <span>{isExpanded ? 'Ocultar' : 'Ver variantes'}</span>
                                <svg
                                  className={`h-4 w-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-dashed border-stone-200 bg-stone-50/60 p-4">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-stone-200/80 text-stone-400">
                                      <th className="pb-2 text-left font-semibold uppercase tracking-wider">Talle / Nro</th>
                                      <th className="pb-2 text-left font-semibold uppercase tracking-wider">Color</th>
                                      <th className="pb-2 text-center font-semibold uppercase tracking-wider">Stock</th>
                                      <th className="pb-2 text-center font-semibold uppercase tracking-wider">Reservado</th>
                                      <th className="pb-2 text-center font-semibold uppercase tracking-wider">Disponible</th>
                                      <th className="pb-2 text-right font-semibold uppercase tracking-wider">Último Costo</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-200/60">
                                    {group.variants.map((variant) => {
                                      const variantAvailable = variant.stock - variant.reserved;
                                      return (
                                        <tr key={variant.id} className="hover:bg-white/60">
                                          <td className="py-2.5 font-medium text-stone-900">
                                            {formatSizeLabel(variant.talle, variant.numero)}
                                          </td>
                                          <td className="py-2.5 text-stone-600">{variant.color || 'Sin color'}</td>
                                          <td className="py-2.5 text-center text-stone-900">{variant.stock}</td>
                                          <td className="py-2.5 text-center text-stone-500">{variant.reserved}</td>
                                          <td className="py-2.5 text-center font-medium text-stone-900">{variantAvailable}</td>
                                          <td className="py-2.5 text-right text-stone-600">
                                            {variant.lastCost != null ? currency(variant.lastCost) : '—'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <StatCard label="Stock libre" value={totalStock - totalReserved} note="Disponible para vender" />
                <StatCard label="Stock bajo" value={stockLowCount} note="Variantes con 3 o menos" />
                <StatCard label="Resumen" value={stockSummary.length} note="Agrupado por producto" />
              </div>
            </section>
          ) : null}

          {/* TAB INGRESOS MEJORADO */}
          {selectedTab === 'ingresos' ? (
            <section className="mt-8">
              <div className="mx-auto max-w-4xl rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-sm">
                <SectionHeader
                  eyebrow="Ingresos"
                  title="Registrar Ingreso de Mercadería"
                  description="Cargá nuevo stock a variantes existentes o da de alta un producto nuevo con foto y medidas."
                />

                <form onSubmit={onIngresoSubmit} className="mt-8 space-y-6">
                  {/* SECCIÓN 1: PRODUCTO & FOTO */}
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">1. Identificación del Producto</p>
                    
                    <div className="grid gap-5 md:grid-cols-[1fr_auto]">
                      <div className="space-y-4">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">Seleccionar Producto</span>
                          <select
                            value={ingresoForm.productoId}
                            onChange={(event) => {
                              const nextProductId = event.target.value;
                              if (nextProductId === '__new__') {
                                setIngresoForm((current) => ({
                                  ...current,
                                  productoId: '__new__',
                                  productoNombre: '',
                                  imagenUrl: '',
                                  talle: '',
                                  numero: '',
                                  color: '',
                                }));
                                return;
                              }

                              const selected = productById.get(String(nextProductId));
                              setIngresoForm((current) => ({
                                ...current,
                                productoId: nextProductId,
                                productoNombre: selected?.nombre ?? current.productoNombre,
                                imagenUrl: selected?.imagenUrl ?? '',
                                talle: '',
                                numero: '',
                                color: '',
                              }));
                            }}
                            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                          >
                            <option value="">-- Elegir de catálogo existente --</option>
                            <option value="__new__">✨ + Crear producto nuevo</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>{product.nombre}</option>
                            ))}
                          </select>
                        </label>

                        {isCreatingNewProduct && (
                          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                            <label className="block">
                              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-emerald-800">Nombre del producto *</span>
                              <input
                                required
                                value={ingresoForm.productoNombre}
                                onChange={(event) => setIngresoForm((c) => ({ ...c, productoNombre: event.target.value }))}
                                placeholder="Ej. Remera Oversize, Body de Encaje..."
                                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-900"
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">URL de la Foto / Imagen</span>
                              <input
                                value={ingresoForm.imagenUrl}
                                onChange={(event) => setIngresoForm((c) => ({ ...c, imagenUrl: event.target.value }))}
                                placeholder="https://res.cloudinary.com/... o enlace web"
                                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-900"
                              />
                            </label>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block">
                                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">Categoría</span>
                                <input
                                  value={ingresoForm.categoria}
                                  onChange={(event) => setIngresoForm((c) => ({ ...c, categoria: event.target.value }))}
                                  placeholder="General, Lencería, etc."
                                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-900"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">Precio Venta Sugerido</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={ingresoForm.precioVenta}
                                  onChange={(event) => setIngresoForm((c) => ({ ...c, precioVenta: event.target.value }))}
                                  placeholder="0.00"
                                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-900"
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Vista previa de foto */}
                      <div className="flex flex-col items-center justify-center">
                        <span className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">Foto</span>
                        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-stone-300 bg-white shadow-inner">
                          {currentPhotoPreview ? (
                            <img
                              src={getThumbnail(currentPhotoPreview)}
                              alt="Preview"
                              className="h-full w-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="text-center text-xs text-stone-400">
                              <span className="block text-2xl">📷</span>
                              <span>Sin imagen</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: VARIANTE (TALLE/NUMERO Y COLOR) */}
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">2. Variante y Medidas</p>

                    <div className="grid gap-5 sm:grid-cols-2">
                      {/* Medida */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">Tipo de Medida</span>
                          <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5">
                            <button
                              type="button"
                              onClick={() => setIngresoForm((c) => ({ ...c, sizeType: 'talle', numero: '' }))}
                              className={`rounded-md px-3 py-1 text-xs font-medium transition ${ingresoForm.sizeType === 'talle' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'}`}
                            >
                              Talle (Letras)
                            </button>
                            <button
                              type="button"
                              onClick={() => setIngresoForm((c) => ({ ...c, sizeType: 'numero', talle: '' }))}
                              className={`rounded-md px-3 py-1 text-xs font-medium transition ${ingresoForm.sizeType === 'numero' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'}`}
                            >
                              Número
                            </button>
                          </div>
                        </div>

                        {ingresoForm.sizeType === 'talle' ? (
                          <input
                            value={ingresoForm.talle}
                            onChange={(event) => setIngresoForm((c) => ({ ...c, talle: event.target.value.toUpperCase() }))}
                            placeholder="Ej. S, M, L, XL, Único..."
                            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-900"
                          />
                        ) : (
                          <input
                            type="number"
                            value={ingresoForm.numero}
                            onChange={(event) => setIngresoForm((c) => ({ ...c, numero: event.target.value }))}
                            placeholder="Ej. 36, 38, 40, 85, 90..."
                            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-900"
                          />
                        )}
                      </div>

                      {/* Color */}
                      <div>
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-600">Color</span>
                        <input
                          list="ingreso-colores"
                          value={ingresoForm.color}
                          onChange={(event) => setIngresoForm((c) => ({ ...c, color: event.target.value }))}
                          placeholder="Ej. Negro, Blanco, Rojo..."
                          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-900"
                        />
                        <datalist id="ingreso-colores">
                          {ingresoColorOptions.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>

                        {/* Pills de colores existentes */}
                        {ingresoColorOptions.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-stone-400">Existentes:</span>
                            {ingresoColorOptions.map((col) => (
                              <button
                                key={col}
                                type="button"
                                onClick={() => setIngresoForm((c) => ({ ...c, color: col }))}
                                className={`rounded-md border px-2 py-0.5 text-xs transition ${ingresoForm.color.toLowerCase() === col.toLowerCase() ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}
                              >
                                {col}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feedback de Stock actual de la variante */}
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
                      <div>
                        <span className="text-xs text-stone-500">Estado de variante:</span>
                        <p className="text-sm font-semibold text-stone-900">
                          {ingresoSelectedVariant ? 'Variante Existente' : 'Nueva Variante (se creará con el ingreso)'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-stone-500">Stock Actual</span>
                        <p className="text-lg font-bold text-stone-950">
                          {ingresoSelectedVariant ? ingresoSelectedVariantStock : 0} u.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 3: CANTIDAD, COSTOS Y PROVEEDOR */}
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-stone-400">3. Detalle de Compra y Stock</p>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">Cantidad Ingresada *</span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={ingresoForm.cantidad}
                          onChange={(event) => setIngresoForm((c) => ({ ...c, cantidad: event.target.value }))}
                          placeholder="Ej. 12"
                          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-stone-900"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">Costo Unitario ($) *</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={ingresoForm.costo}
                          onChange={(event) => setIngresoForm((c) => ({ ...c, costo: event.target.value }))}
                          placeholder="0.00"
                          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-stone-900"
                        />
                      </label>

                      <div className="flex flex-col justify-center rounded-xl border border-stone-200 bg-white px-4 py-2">
                        <span className="text-[10px] uppercase tracking-wider text-stone-400">Costo Total del Ingreso</span>
                        <span className="text-lg font-bold text-stone-900">
                          {currency(toNumber(ingresoForm.cantidad) * toNumber(ingresoForm.costo))}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">Proveedor</span>
                        <input
                          value={ingresoForm.proveedor}
                          onChange={(event) => setIngresoForm((c) => ({ ...c, proveedor: event.target.value }))}
                          placeholder="Nombre del taller o distribuidor"
                          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-900"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-600">Nota u Observación</span>
                        <input
                          value={ingresoForm.nota}
                          onChange={(event) => setIngresoForm((c) => ({ ...c, nota: event.target.value }))}
                          placeholder="Lote #1, reposición..."
                          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-900"
                        />
                      </label>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIngresoForm(INGRESO_EMPTY)}
                      className="rounded-full border border-stone-300 bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-stone-600 transition hover:border-stone-500 hover:text-stone-950"
                    >
                      Limpiar Formulario
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-emerald-600 px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                    >
                      Confirmar y Cargar Ingreso
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : null}

          {/* TAB VENTAS */}
          {selectedTab === 'ventas' ? (
            <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6">
                <SectionHeader
                  eyebrow="Ventas"
                  title="Productos disponibles"
                  description="Elegí variantes con stock, armá la venta y confirmala desde el panel. El stock se descuenta con el flujo del backend."
                />

                <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_0.4fr]">
                  <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                    <span>Buscar</span>
                    <input
                      value={saleSearch}
                      onChange={(event) => setSaleSearch(event.target.value)}
                      placeholder="Producto, talle, número, color o precio"
                      className="w-full bg-transparent text-stone-900 outline-none placeholder:text-stone-400"
                    />
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
                    <span>Cant.</span>
                    <input
                      type="number"
                      min="1"
                      value={saleQuantity}
                      onChange={(event) => setSaleQuantity(event.target.value)}
                      className="w-full bg-transparent text-stone-900 outline-none"
                    />
                  </label>
                </div>

                <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-stone-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Producto</th>
                        <th className="px-4 py-3 text-left font-medium">Variante</th>
                        <th className="px-4 py-3 text-left font-medium">Stock</th>
                        <th className="px-4 py-3 text-left font-medium">Precio</th>
                        <th className="px-4 py-3 text-left font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableSaleVariants.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6">
                            <EmptyState title="No hay productos disponibles" description="No quedaron variantes con stock para vender." />
                          </td>
                        </tr>
                      ) : availableSaleVariants.map((variant) => {
                        const isSelected = selectedSaleVariantId === variant.variantId;

                        return (
                          <tr key={variant.variantId} className="border-t border-stone-200">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {variant.imageUrl ? <img src={getThumbnail(variant.imageUrl)} alt={variant.productName} className="h-10 w-10 rounded object-cover" /> : null}
                                <span className="font-medium text-stone-900">{variant.productName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-stone-600">{formatSizeLabel(variant.talle, variant.numero)} · {variant.color || 'Sin color'}</td>
                            <td className="px-4 py-3 text-stone-900">{variant.stock}</td>
                            <td className="px-4 py-3 text-stone-900">{currency(variant.salePrice)}</td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => addSaleItem(variant)}
                                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] transition ${isSelected ? 'bg-emerald-600 text-white' : 'border border-stone-300 bg-white text-stone-600 hover:border-stone-500 hover:text-stone-950'}`}
                              >
                                {isSelected ? 'Agregado' : 'Agregar'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6">
                <SectionHeader
                  eyebrow="Venta"
                  title="Registrar venta"
                  description="Agregá productos de la tabla y confirmá la operación."
                  action={(
                    <div className="text-xs uppercase tracking-[0.28em] text-stone-500">
                      {saleItems.length} líneas
                    </div>
                  )}
                />

                <form onSubmit={onRegisterSale} className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">Email de contacto</span>
                    <input
                      value={saleEmail}
                      onChange={(event) => setSaleEmail(event.target.value)}
                      placeholder={user?.email || 'cliente@ejemplo.com'}
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none placeholder:text-stone-400"
                    />
                  </label>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-center justify-between text-sm text-stone-600">
                      <span>Cantidad total</span>
                      <span>{pendingSaleQuantity}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-stone-600">
                      <span>Total estimado</span>
                      <span>{currency(pendingSaleTotal)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {saleItems.length === 0 ? (
                      <EmptyState title="Todavía no agregaste productos" description="Elegí productos de la tabla para armar la venta." />
                    ) : saleItems.map((item) => (
                      <div key={item.variantId} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-stone-950">{item.productName}</p>
                            <p className="mt-1 text-sm text-stone-500">{formatSizeLabel(item.talle, item.numero)} · {item.color || 'Sin color'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSaleItem(item.variantId)}
                            className="text-xs font-bold uppercase tracking-[0.22em] text-red-600"
                          >
                            Quitar
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-stone-600">
                          <span>Cant. {item.quantity}</span>
                          <span>{currency(item.salePrice)} c/u</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={saleSubmitting}
                      className="rounded-full bg-stone-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.26em] text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saleSubmitting ? 'Registrando...' : 'Registrar venta'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSaleItems([]);
                        setSaleQuantity(1);
                        setSelectedSaleVariantId('');
                      }}
                      className="rounded-full border border-stone-300 bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.26em] text-stone-600 transition hover:border-stone-500 hover:text-stone-950"
                    >
                      Limpiar
                    </button>
                  </div>
                </form>

                <div className="mt-6 space-y-3">
                  <SectionHeader
                    eyebrow="Historial"
                    title="Ventas recientes"
                    description="Consultá pedidos por email o por tu usuario actual."
                    action={(
                      <div className="text-xs uppercase tracking-[0.28em] text-stone-500">
                        {loadingSales ? 'Cargando...' : `${sales.length} registros`}
                      </div>
                    )}
                  />

                  <form
                    className="mt-4 flex flex-wrap gap-3"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await loadSalesData(saleEmail);
                    }}
                  >
                    <input
                      value={saleEmail}
                      onChange={(event) => setSaleEmail(event.target.value)}
                      placeholder="Buscar por email"
                      className="flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none placeholder:text-stone-400"
                    />
                    <button type="submit" className="rounded-full border border-stone-300 bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.26em] text-stone-600 transition hover:border-stone-500 hover:text-stone-950">
                      Buscar
                    </button>
                  </form>

                  <div className="space-y-3">
                    {sales.length === 0 ? (
                      <EmptyState title="No hay ventas para mostrar" description="Registrá una venta o buscá por email." />
                    ) : sales.map((sale) => (
                      <div key={sale.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-stone-950">Pedido #{sale.id}</p>
                          <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-stone-600">{sale.estado}</span>
                        </div>
                        <p className="mt-2 text-sm text-stone-500">{formatDateTime(sale.fecha)} · {sale.itemsCount} items · {currency(sale.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {message ? <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p> : null}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboardPage;