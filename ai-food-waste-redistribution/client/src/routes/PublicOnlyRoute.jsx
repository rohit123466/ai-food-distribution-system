import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Keeps already-authenticated users off /login and /register.
export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return null;
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
