import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function Login() {
  const handleZohoLogin = () => {
    window.location.href = "/api/auth/zoho";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-primary-foreground">E</span>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to EmpowerLink</CardTitle>
          <CardDescription>
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
          <p className="text-xs text-center text-muted-foreground mt-6">
            By signing in, you agree to comply with Australian privacy laws
            and EmpowerLink's data protection policies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
