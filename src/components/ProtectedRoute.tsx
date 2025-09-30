import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication and whitelist status
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/auth");
          return;
        }

        setUser(session.user);

        // Check if user is whitelisted
        const { data, error } = await supabase.rpc('is_whitelisted', {
          user_email: session.user.email
        });

        if (error) {
          console.error("Error checking whitelist:", error);
          setIsWhitelisted(false);
        } else {
          setIsWhitelisted(data);
        }
      } catch (error) {
        console.error("Error in auth check:", error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        // Re-check whitelist status on auth change
        setTimeout(() => {
          checkAuth();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isWhitelisted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            Your account ({user?.email}) is not authorized to access this page.
          </p>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
