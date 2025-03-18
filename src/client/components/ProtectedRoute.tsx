import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingIndicator from './LoadingIndicator';

interface ProtectedRouteProps {
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRoles = [] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading indicator while authentication status is being determined
  if (isLoading) {
    return <LoadingIndicator />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are required, check if user has any of the required roles
  if (requiredRoles.length > 0 && user?.role) {
    const hasRequiredRole = requiredRoles.includes(user.role);
    
    if (!hasRequiredRole) {
      // User doesn't have the required role, redirect to unauthorized page
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // If authenticated and has required roles (or no roles required), render the protected content
  return <Outlet />;
};

export default ProtectedRoute;