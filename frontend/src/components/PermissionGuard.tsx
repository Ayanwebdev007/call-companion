
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface PermissionGuardProps {
    permission?: string;
    requireAdmin?: boolean;
}

const PermissionGuard = ({ permission, requireAdmin }: PermissionGuardProps) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return null; // Or a spinner, but ProtectedRoute usually handles the main loading

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // Admins have access to everything usually, but if specific permission is strictly required:
    if (user.role === 'admin') return <Outlet />;

    if (permission && !user.permissions?.includes(permission)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default PermissionGuard;
