import { Clock, LogOut, Mail, RefreshCw, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/EmpowerLink Word_1764064625503.png";

export default function PendingApproval() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"pending" | "rejected" | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.authenticated && data.user?.approvalStatus) {
          setStatus(data.user.approvalStatus as "pending" | "rejected");
        }
      } catch {
        // Ignore errors
      }
    };
    checkStatus();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      
      if (data.authenticated && data.user?.approvalStatus === "approved") {
        window.location.href = "/";
      } else if (!data.authenticated) {
        window.location.href = "/login";
      } else {
        setStatus(data.user?.approvalStatus as "pending" | "rejected");
        toast({
          title: status === "rejected" ? "Access Denied" : "Still Pending",
          description: status === "rejected" 
            ? "Your access request has been denied." 
            : "Your account is still awaiting approval. Please check back later.",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to check approval status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // Clear JWT token from localStorage first
      localStorage.removeItem('empowerlink_auth_token');
      
      // Try to call logout API
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Ignore API errors - token is already cleared
      }
      
      window.location.href = "/login";
    } catch {
      localStorage.removeItem('empowerlink_auth_token');
      window.location.href = "/login";
    }
  };

  const isRejected = status === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex items-center justify-center mb-2">
            <img src={logoImage} alt="EmpowerLink" className="h-10 w-auto" data-testid="img-logo" />
          </div>
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            isRejected 
              ? "bg-red-100 dark:bg-red-900/20" 
              : "bg-amber-100 dark:bg-amber-900/20"
          }`}>
            {isRejected ? (
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            ) : (
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {isRejected ? "Access Denied" : "Awaiting Approval"}
          </CardTitle>
          <CardDescription className="text-base">
            {isRejected 
              ? "Your access request has been denied by an administrator"
              : "Your account is pending approval from an administrator"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-sm text-muted-foreground space-y-3">
            {isRejected ? (
              <>
                <p>
                  Your request to access EmpowerLink has been reviewed and denied.
                </p>
                <p>
                  If you believe this is an error, please contact your manager or 
                  the system administrator for assistance.
                </p>
              </>
            ) : (
              <>
                <p>
                  Thank you for registering with EmpowerLink. Your account has been created 
                  and is now awaiting approval from a Director or Operations Manager.
                </p>
                <p>
                  You will be able to access the system once your account has been approved 
                  and a role has been assigned to you.
                </p>
              </>
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{isRejected ? "Need help?" : "Need urgent access?"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {isRejected 
                ? "Contact your manager or administrator to discuss your access request."
                : "Contact your manager or administrator to expedite the approval process."
              }
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {!isRejected && (
              <Button 
                onClick={handleRefresh} 
                className="w-full gap-2"
                disabled={isLoading}
                data-testid="button-check-status"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Check Approval Status
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full gap-2"
              disabled={isLoading}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
