import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();
  
  console.log('ProtectedRoute - user:', user, 'isLoading:', isLoading);

  if (isLoading) {
    console.log('ProtectedRoute - showing loading spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute - allowing access');
  return <Outlet />;
};

export default ProtectedRoute;
