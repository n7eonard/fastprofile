import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has valid session token
    const checkAuth = () => {
      const token = sessionStorage.getItem('admin_session_token');
      const expiresAt = sessionStorage.getItem('admin_session_expires');
      
      if (!token || !expiresAt) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      // Check if token has expired
      const expiryDate = new Date(expiresAt);
      if (expiryDate <= new Date()) {
        // Token expired, clear it
        sessionStorage.removeItem('admin_session_token');
        sessionStorage.removeItem('admin_session_expires');
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleSignOut = () => {
    sessionStorage.removeItem('admin_session_token');
    sessionStorage.removeItem('admin_session_expires');
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/auth");
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
