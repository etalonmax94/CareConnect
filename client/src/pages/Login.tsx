import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LogIn, Code, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/EmpowerLink Word_1764064625503.png";

const isDevelopment = import.meta.env.DEV;
// Use Cloud Run URL for OAuth flow  
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://careconnect-124485508170.australia-southeast1.run.app';

export default function Login() {
  const [devName, setDevName] = useState("Developer");
  const [devRole, setDevRole] = useState("admin");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: devName, role: devRole }),
        credentials: "include", // Required for session cookies
      });

      if (response.ok) {
        toast({
          title: "Developer Login Successful",
          description: `Logged in as ${devName} (${devRole})`,
        });
        window.location.href = "/";
      } else {
        const error = await response.json();
        toast({
          title: "Login Failed",
          description: error.error || "Dev login failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex items-center justify-center mb-2">
            <img src={logoImage} alt="EmpowerLink" className="h-10 w-auto" data-testid="img-logo" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-base">
            Healthcare CRM for NDIS, Aged Care & Private Clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground mb-6">
            Sign in with your Zoho account to access the CRM system
          </div>
          <a 
            href={`${API_BASE_URL}/api/auth/zoho`}
            className="inline-flex items-center justify-center gap-2 w-full h-11 px-8 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90"
            data-testid="button-zoho-login"
          >
            <LogIn className="h-5 w-5" />
            Sign in with Zoho
          </a>

          {isDevelopment && (
            <>
              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  Development Only
                </span>
              </div>

              <div className="space-y-4 p-4 border border-dashed border-amber-500/50 rounded-lg bg-amber-50/50 dark:bg-amber-900/10">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                  <Code className="h-4 w-4" />
                  Developer Access
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dev-name" className="text-sm">Display Name</Label>
                    <Input
                      id="dev-name"
                      value={devName}
                      onChange={(e) => setDevName(e.target.value)}
                      placeholder="Enter name"
                      data-testid="input-dev-name"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="dev-role" className="text-sm">Role</Label>
                    <Select value={devRole} onValueChange={setDevRole}>
                      <SelectTrigger id="dev-role" data-testid="select-dev-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="operations_manager">Operations Manager</SelectItem>
                        <SelectItem value="clinical_manager">Clinical Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="care_manager">Care Manager</SelectItem>
                        <SelectItem value="support_worker">Support Worker</SelectItem>
                        <SelectItem value="enrolled_nurse">Enrolled Nurse</SelectItem>
                        <SelectItem value="registered_nurse">Registered Nurse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleDevLogin}
                  variant="outline"
                  className="w-full gap-2 border-amber-500/50 text-amber-700 dark:text-amber-400"
                  disabled={isLoading || !devName}
                  data-testid="button-dev-login"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Code className="h-4 w-4" />
                  )}
                  Login as Developer
                </Button>
              </div>
            </>
          )}

          <p className="text-xs text-center text-muted-foreground mt-6">
            By signing in, you agree to comply with Australian privacy laws
            and EmpowerLink's data protection policies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
