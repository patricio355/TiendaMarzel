import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import ProductHoverImage from '../components/ProductHoverImage';
import { useCart } from '../context/CartContext';
import { listProducts } from '../lib/api';
import { currency, FALLBACK_PRODUCTS, normalizeProduct, toArray } from '../lib/shop';
import { getMediumImage } from '../lib/cloudinary';

const marqueeItems = [
  '🔥 HOT SALE EN MARZEL',
  '❤️ TU COMPRA TIENE REGALO',
  '🚚 Envíos a todo el país',
];

const marqueeCycle = Array.from({ length: 4 }, () => marqueeItems).flat();

function StorePage() {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await listProducts();
        const normalized = toArray(response).map(normalizeProduct).filter(Boolean);
        if (active) {
          setProducts(normalized.length ? normalized : FALLBACK_PRODUCTS);
        }
      } catch {
        if (active) {
          setProducts(FALLBACK_PRODUCTS);
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
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (!query) {
        return true;
      }

      return [product.nombre, product.descripcion, product.categoria]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [products, search]);

  return (
    <div className="min-h-screen bg-[#efefef] text-stone-900">
      <section className="relative h-[68vh] min-h-[500px] overflow-hidden bg-[#f5f1e8]">
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/portada.png"
            alt="Hero"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="relative z-10">
          <Navbar light />
        </div>
      </section>

      <section className="overflow-hidden border-y border-white/10 bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
        <div className="marquee-track flex min-w-max w-max items-center py-3 text-[11px] font-semibold uppercase tracking-[0.28em] sm:text-xs">
          {[0, 1].map((groupIndex) => (
            <div key={groupIndex} className="marquee-group flex items-center gap-8 pr-8 sm:gap-10 sm:pr-10">
              {marqueeCycle.map((item, itemIndex) => (
                <div key={`${groupIndex}-${itemIndex}-${item}`} className="flex items-center gap-8 sm:gap-10">
                  <span className="whitespace-nowrap text-white">{item}</span>
                  <span className="text-white/80">•</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-10">
        <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Inicio / Novedades</p>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto"
            className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-sm outline-none sm:w-72"
          />
        </div>

        {loading ? (
          <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[350px] animate-pulse rounded bg-white" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <article key={product.id} className="group overflow-hidden bg-white">
                <Link to={`/producto/${encodeURIComponent(product.id)}`} state={{ product }} className="block">
                        <ProductHoverImage
                          primarySrc={product.imagenUrl}
                          secondarySrc={product.imagenSecundaria}
                          alt={product.nombre}
                          className="aspect-[2/3] bg-stone-100"
                        />
                </Link>
                <div className="space-y-2 py-4">
                  <Link to={`/producto/${encodeURIComponent(product.id)}`} state={{ product }} className="text-xl font-medium text-stone-900 hover:text-stone-700 lg:text-2xl">
                    {product.nombre}
                  </Link>
                  <p className="line-clamp-2 text-xs text-stone-500 lg:text-sm">{product.descripcion}</p>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-700 lg:text-sm">{currency(product.precio)}</p>
                      <button
                        type="button"
                        onClick={() => {
                          const variantId = product.variants?.[0]?.id;
                          if (!variantId) {
                            // navigate to product detail so user can select variant
                            navigate(`/producto/${encodeURIComponent(product.id)}`, { state: { product } });
                            return;
                          }
                          addItem(variantId, 1);
                        }}
                        className="rounded-full border border-stone-300 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-700 transition hover:border-stone-900 hover:text-stone-900 lg:text-xs"
                      >
                        Añadir
                      </button>
                    </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default StorePage;
