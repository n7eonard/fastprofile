import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user already has a valid session
    const token = sessionStorage.getItem('admin_session_token');
    const expiresAt = sessionStorage.getItem('admin_session_expires');
    
    if (token && expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (expiryDate > new Date()) {
        navigate("/recordings");
      } else {
        // Clear expired session
        sessionStorage.removeItem('admin_session_token');
        sessionStorage.removeItem('admin_session_expires');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error("Please enter a password");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-password', {
        body: { password },
      });

      if (error) throw error;

      if (data.valid && data.sessionToken) {
        // Store secure session token
        sessionStorage.setItem('admin_session_token', data.sessionToken);
        sessionStorage.setItem('admin_session_expires', data.expiresAt);
        toast.success("Access granted");
        navigate("/recordings");
      } else {
        toast.error("Invalid password");
        setPassword("");
      }
    } catch (error) {
      console.error("Error verifying password:", error);
      toast.error("Failed to verify password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Protected Area</h1>
          <p className="text-muted-foreground">
            Enter the password to access recordings
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Access Recordings"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
