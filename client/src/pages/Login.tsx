import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LogIn, TestTube2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/EmpowerLink Word_1764064625503.png";

const DEV_ROLES = [
  "Support Worker",
  "Enrolled Nurse", 
  "Registered Nurse",
  "Admin",
  "Operations Manager",
  "Care Manager",
  "Clinical Manager",
  "Director"
];

export default function Login() {
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devName, setDevName] = useState("Test User");
  const [devRole, setDevRole] = useState("Admin");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleZohoLogin = () => {
    window.location.href = "/api/auth/zoho";
  };

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: devName, role: devRole }),
        credentials: "include"
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Dev Login Successful",
          description: `Logged in as ${devName} (${devRole})`,
        });
        window.location.href = "/";
      } else {
        throw new Error(data.error || "Login failed");
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Could not complete dev login",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
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
          <Button 
            onClick={handleZohoLogin} 
            className="w-full gap-2"
            size="lg"
            data-testid="button-zoho-login"
          >
            <LogIn className="h-5 w-5" />
            Sign in with Zoho
          </Button>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          {!showDevLogin ? (
            <Button 
              variant="outline"
              onClick={() => setShowDevLogin(true)}
              className="w-full gap-2"
              data-testid="button-show-dev-login"
            >
              <TestTube2 className="h-4 w-4" />
              Test Mode (Development Only)
            </Button>
          ) : (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <p className="text-sm font-medium text-center">Development Test Login</p>
              <Input
                placeholder="Your name"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                data-testid="input-dev-name"
              />
              <Select value={devRole} onValueChange={setDevRole}>
                <SelectTrigger data-testid="select-dev-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {DEV_ROLES.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleDevLogin}
                className="w-full gap-2"
                disabled={isLoading}
                data-testid="button-dev-login"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube2 className="h-4 w-4" />
                )}
                Enter Test Mode
              </Button>
              <p className="text-xs text-center text-amber-600 dark:text-amber-400">
                This option is only available in development mode
              </p>
            </div>
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
