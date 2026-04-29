export const FALLBACK_PRODUCTS = [
  {
    id: 'demo-1',
    nombre: 'Soft Knit Set',
    descripcion: 'Coleccion suave para la temporada.',
    precio: 84.9,
    categoria: 'NEW IN',
    imagenUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1400',
  },
  {
    id: 'demo-2',
    nombre: 'Minimal Long Dress',
    descripcion: 'Estilo editorial para una silueta limpia.',
    precio: 96.4,
    categoria: 'NEW IN',
    imagenUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1400',
  },
  {
    id: 'demo-3',
    nombre: 'Animal Print Shirt',
    descripcion: 'Pieza protagonista con identidad moderna.',
    precio: 72,
    categoria: 'NEW IN',
    imagenUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1400',
  },
  {
    id: 'demo-4',
    nombre: 'Warm Cardigan',
    descripcion: 'Textura suave para el dia a dia.',
    precio: 65.5,
    categoria: 'NEW IN',
    imagenUrl: 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1400',
  },
];

export function currency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export function toArray(value) {
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

export function normalizeVariant(variant, index) {
  if (!variant) {
    return null;
  }

  return {
    id: variant.id ?? variant.varianteId ?? variant.variantId ?? `${index}`,
    nombre: variant.nombre ?? variant.name ?? variant.talle ?? variant.color ?? `Variante ${index + 1}`,
    precio: Number(variant.precio ?? variant.price ?? 0),
  };
}

export function normalizeProduct(product) {
  if (!product) {
    return null;
  }

  const images = toArray(product.imagenes ?? product.images ?? product.galeria);
  const variants = toArray(product.variantes ?? product.variants)
    .map((variant, index) => normalizeVariant(variant, index))
    .filter(Boolean);

  return {
    id: product.id ?? product.productoId ?? product.productId,
    nombre: product.nombre ?? product.name ?? 'Producto',
    descripcion: product.descripcion ?? product.description ?? '',
    precio: Number(product.precio ?? product.price ?? 0),
    categoria: product.categoria ?? product.category ?? 'General',
    imagenUrl: product.imagenUrl ?? product.imagen ?? product.image ?? images[0] ?? FALLBACK_PRODUCTS[0].imagenUrl,
    images,
    variants,
    raw: product,
  };
}
