import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/lib/supabase";
import { PageLayoutSkeleton, DashboardSkeleton } from "@/components/ui/SkeletonScreens";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If set, only these roles can access the route. Redirects others. */
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/");
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "staff") navigate("/staff");
      else navigate("/dashboard");
    }
  }, [user, isLoading, allowedRoles, navigate]);

  if (isLoading) {
    return (
      <PageLayoutSkeleton>
        <DashboardSkeleton />
      </PageLayoutSkeleton>
    );
  }
  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;
  return <>{children}</>;
};
