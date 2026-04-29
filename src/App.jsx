import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import AuthPage from './pages/AuthPage';
import CartPage from './pages/CartPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import StorePage from './pages/StorePage';
import ProductDetailPage from './pages/ProductDetailPage';

function AdminRoute({ children }) {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-stone-600">Cargando...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<StorePage />} />
          <Route path="/producto/:id" element={<ProductDetailPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route
            path="/admin/dashboard"
            element={(
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;