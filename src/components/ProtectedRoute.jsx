import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Wraps a route so it redirects to /login when the user is not authenticated.
 * Saves the current path so we can redirect back after login (future enhancement).
 */
export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
