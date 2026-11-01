import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function navLinkClass({ isActive }) {
  return `text-sm font-medium ${isActive ? 'text-emerald-700' : 'text-gray-600 hover:text-gray-900'}`;
}

export default function Layout() {
  const { user, isAuthenticated, isInitializing, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold text-gray-800">
            AI Food Waste Redistribution
          </Link>

          {!isInitializing && (
            <div className="flex items-center gap-5">
              {isAuthenticated ? (
                <>
                  <NavLink to="/dashboard" className={navLinkClass}>
                    Dashboard
                  </NavLink>
                  <span className="text-sm text-gray-500">
                    {user.name} <span className="text-gray-400">({user.role})</span>
                  </span>
                  <button
                    onClick={logout}
                    className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={navLinkClass}>
                    Login
                  </NavLink>
                  <NavLink
                    to="/register"
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Register
                  </NavLink>
                </>
              )}
            </div>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
