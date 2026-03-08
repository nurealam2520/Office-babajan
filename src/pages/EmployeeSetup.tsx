import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import officeLogo from "@/assets/office-logo.png";

const setupSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  employeeId: z.string().trim().min(3, "Employee ID must be at least 3 characters").max(20, "Employee ID too long").regex(/^[a-zA-Z0-9_-]+$/, "Employee ID can only contain letters, numbers, underscore and dash")
});

const EmployeeSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Check if employee_id already set
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, employee_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile?.employee_id) {
        // Already has employee_id, redirect to appropriate dashboard
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        const isSuperAdmin = roles?.some(r => r.role === "super_admin");
        const isAdmin = roles?.some(r => r.role === "admin");
        const isManager = roles?.some(r => r.role === "manager");

        if (isSuperAdmin || isAdmin) navigate("/admin");
        else if (isManager) navigate("/manager");
        else navigate("/dashboard");
        return;
      }

      // Set initial name if available
      if (profile?.full_name) {
        setFullName(profile.full_name);
      }
      
      setInitialLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = setupSchema.parse({ fullName, employeeId });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Check if employee_id is already taken
      const { data: existing } = await supabase
        .from("profiles")
        .select("employee_id")
        .eq("employee_id", validated.employeeId)
        .maybeSingle();

      if (existing) {
        toast({ 
          title: "Employee ID already taken", 
          description: "Please choose a different employee ID",
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      // Update profile with employee_id and full_name
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: validated.fullName,
          employee_id: validated.employeeId
        })
        .eq("user_id", session.user.id);

      if (error) {
        toast({ 
          title: "Setup failed", 
          description: error.message, 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      toast({ title: "Setup completed successfully!" });

      // Redirect to appropriate dashboard based on role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const isSuperAdmin = roles?.some(r => r.role === "super_admin");
      const isAdmin = roles?.some(r => r.role === "admin");
      const isManager = roles?.some(r => r.role === "manager");

      if (isSuperAdmin || isAdmin) navigate("/admin");
      else if (isManager) navigate("/manager");
      else navigate("/dashboard");

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ 
          title: "Validation error", 
          description: error.errors[0].message, 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Setup failed", 
          description: "An unexpected error occurred", 
          variant: "destructive" 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={officeLogo} alt="Office Management" className="h-12 w-12 rounded-full object-cover" />
          </div>
          <CardTitle className="text-xl">Employee Setup</CardTitle>
          <CardDescription>
            Complete your profile setup to access the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                type="text"
                placeholder="Enter unique employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toLowerCase())}
                required
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                3-20 characters, letters, numbers, underscore and dash only
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting up..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeSetup;