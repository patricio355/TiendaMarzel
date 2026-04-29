import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useCart } from '../context/CartContext';
import { listProducts } from '../lib/api';
import { currency, FALLBACK_PRODUCTS, normalizeProduct, toArray } from '../lib/shop';

function StorePage() {
  const { addItem } = useCart();
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
      <section className="relative h-[68vh] min-h-[500px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1974&auto=format&fit=crop"
          alt="Hero"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-black/10" />

        <div className="relative z-10">
          <Navbar light />
        </div>

        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-16 sm:px-6 lg:px-8">
          <p className="text-3xl font-light uppercase tracking-[0.35em] text-white/80">Slow Mornings</p>
          <h1 className="text-7xl font-light leading-none tracking-tight text-white sm:text-8xl lg:text-9xl">new in</h1>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Inicio / New In</p>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto"
            className="w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-sm outline-none sm:w-72"
          />
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[350px] animate-pulse rounded bg-white" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <article key={product.id} className="group overflow-hidden bg-white">
                <Link to={`/producto/${encodeURIComponent(product.id)}`} state={{ product }} className="block">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img src={product.imagenUrl} alt={product.nombre} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <span className="absolute right-3 top-3 text-[11px] uppercase tracking-[0.24em] text-stone-700">New In</span>
                  </div>
                </Link>
                <div className="space-y-2 py-4">
                  <Link to={`/producto/${encodeURIComponent(product.id)}`} state={{ product }} className="text-2xl font-medium text-stone-900 hover:text-stone-700">
                    {product.nombre}
                  </Link>
                  <p className="line-clamp-2 text-sm text-stone-500">{product.descripcion}</p>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-700">{currency(product.precio)}</p>
                    <button
                      type="button"
                      onClick={() => addItem(product.variants?.[0]?.id || product.id, 1)}
                      className="rounded-full border border-stone-300 px-3 py-1 text-xs uppercase tracking-[0.22em] text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
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
