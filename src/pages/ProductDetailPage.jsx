import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { getProduct, listProducts } from '../lib/api';
import { currency, normalizeProduct, toArray } from '../lib/shop';

function ProductDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { addItem } = useCart();
  const routeId = decodeURIComponent(id ?? '');
  const stateProduct = location.state?.product ?? null;

  const [product, setProduct] = useState(stateProduct);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(stateProduct?.imagenUrl ?? '');
  const [selectedSize, setSelectedSize] = useState('01');
  const [loading, setLoading] = useState(!stateProduct);

  const gallery = useMemo(() => {
    const images = [
      selectedImage || product?.imagenUrl,
      ...(product?.images ?? []),
    ].filter(Boolean);

    if (images.length === 0) {
      return [];
    }

    return [...new Set(images)].slice(0, 5);
  }, [product?.images, product?.imagenUrl, selectedImage]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let active = true;

    setLoading(!stateProduct);
    setProduct(stateProduct);
    setSelectedImage(stateProduct?.imagenUrl ?? '');

    void (async () => {
      try {
        const [detailResponse, listResponse] = await Promise.all([
          getProduct(routeId),
          listProducts(),
        ]);

        if (!active) {
          return;
        }

        const normalizedDetail = normalizeProduct(detailResponse);
        const detailMatchesRoute = String(normalizedDetail?.id ?? '') === String(routeId);
        const resolvedProduct = detailMatchesRoute ? normalizedDetail : (stateProduct ?? normalizedDetail);

        setProduct(resolvedProduct);
        setSelectedImage(resolvedProduct?.imagenUrl ?? '');

        const normalizedProducts = toArray(listResponse).map(normalizeProduct).filter(Boolean);
        setRelatedProducts(normalizedProducts.filter((item) => String(item.id) !== String(resolvedProduct?.id)).slice(0, 4));
      } catch {
        if (!active) {
          return;
        }

        const fallbackProduct = stateProduct;
        setProduct(fallbackProduct);
        setSelectedImage(fallbackProduct?.imagenUrl ?? '');

        try {
          const listResponse = await listProducts();
          if (active) {
            const normalizedProducts = toArray(listResponse).map(normalizeProduct).filter(Boolean);
            setRelatedProducts(normalizedProducts.filter((item) => String(item.id) !== String(fallbackProduct?.id)).slice(0, 4));
          }
        } catch {
          setRelatedProducts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [routeId, stateProduct]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#efefef]">
        <Navbar />
        <div className="mx-auto grid max-w-7xl place-items-center px-4 py-24 text-stone-600">Cargando producto...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#efefef]">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-sm uppercase tracking-[0.24em] text-stone-500">Producto no encontrado</p>
          <Link to="/" className="mt-4 inline-flex rounded-full border border-stone-300 px-4 py-2 text-xs uppercase tracking-[0.24em] text-stone-700">Volver a tienda</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efefef] text-stone-900">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="overflow-hidden bg-white">
            <img
              src={selectedImage || product.imagenUrl}
              alt={product.nombre}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[106px_1fr]">
            <div className="order-2 flex gap-3 overflow-x-auto lg:order-1 lg:flex-col">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`h-28 w-24 shrink-0 overflow-hidden border ${selectedImage === image ? 'border-black' : 'border-stone-300'}`}
                >
                  <img src={image} alt={`Vista ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <section className="order-1 bg-[#efefef] lg:order-2">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-600">Inicio / {product.nombre}</p>
              <p className="mt-6 text-xs uppercase tracking-[0.24em] text-stone-600">New In</p>

              <div className="mt-4 flex items-center justify-between gap-4">
                <h1 className="text-3xl font-medium uppercase tracking-wide">{product.nombre}</h1>
                <p className="text-2xl font-semibold">{currency(product.precio)}</p>
              </div>

              <p className="mt-3 text-sm text-stone-500">3 cuotas sin interés</p>
              <p className="text-sm text-stone-500">Precio sin impuestos nacionales ${Number(product.precio * 0.81).toFixed(2)}</p>

              <div className="mt-7 border-b border-stone-300 pb-3">
                <p className="text-sm uppercase tracking-[0.2em] text-stone-700">Detalles de la prenda</p>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {product.descripcion || 'Prenda premium confeccionada para uso diario con una silueta moderna.'}
                </p>
              </div>

              <div className="mt-5">
                <p className="text-sm uppercase tracking-[0.2em] text-stone-700">Color: Crudo</p>
                <div className="mt-2 h-5 w-5 rounded-full border border-stone-400 bg-stone-200" />
              </div>

              <div className="mt-6">
                <p className="text-sm uppercase tracking-[0.2em] text-stone-700">Talle</p>
                <div className="mt-3 flex gap-2">
                  {['01', '02', '03'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-full border px-4 py-2 text-sm ${selectedSize === size ? 'border-black bg-black text-white' : 'border-stone-300 bg-white text-stone-700'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => addItem(product.variants?.[0]?.id || product.id, 1)}
                className="mt-7 w-full rounded-full bg-black px-6 py-4 text-sm font-medium uppercase tracking-[0.24em] text-white"
              >
                Agregar a la bolsa
              </button>

              <div className="mt-8 space-y-3 text-sm uppercase tracking-[0.2em] text-stone-700">
                <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                  <span>Promociones bancarias</span>
                  <span>+</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-300 pb-3">
                  <span>Envíos, cambios y devoluciones</span>
                  <span>+</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="mt-14">
          <h2 className="text-sm uppercase tracking-[0.24em] text-stone-700">Otros productos que pueden interesarte</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <Link key={item.id} to={`/producto/${encodeURIComponent(item.id)}`} state={{ product: item }} className="group bg-white">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img src={item.imagenUrl} alt={item.nombre} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute right-3 top-3 text-[11px] uppercase tracking-[0.24em] text-stone-700">New In</span>
                </div>
                <div className="p-4">
                  <p className="text-lg font-medium text-stone-900">{item.nombre}</p>
                  <p className="mt-1 text-sm text-stone-500">{currency(item.precio)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default ProductDetailPage;
