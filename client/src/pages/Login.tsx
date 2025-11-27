import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LogIn, Code, Loader2, Users, Shield, FileText, BarChart3, Calendar, Heart, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/EmpowerLink Word_1764064625503.png";

const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://careconnect-124485508170.australia-southeast1.run.app';

const features = [
  {
    icon: Users,
    title: "Client Management",
    description: "Comprehensive profiles for NDIS, Aged Care & Private clients"
  },
  {
    icon: Shield,
    title: "Privacy Compliant",
    description: "Built for Australian healthcare privacy regulations"
  },
  {
    icon: FileText,
    title: "Document Tracking",
    description: "Never miss a compliance deadline with smart reminders"
  },
  {
    icon: BarChart3,
    title: "Insightful Reports",
    description: "Real-time analytics and budget tracking"
  },
  {
    icon: Calendar,
    title: "Service Scheduling",
    description: "Streamlined appointment and service management"
  },
  {
    icon: Heart,
    title: "Care Coordination",
    description: "Connect care teams for better client outcomes"
  }
];

function FloatingShape({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div 
      className={`absolute rounded-full opacity-20 animate-float ${className}`}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const Icon = feature.icon;
  return (
    <div 
      className="flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-[1.02] cursor-default"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="p-2 rounded-lg bg-white/20">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-white">{feature.title}</h3>
        <p className="text-sm text-white/70">{feature.description}</p>
      </div>
    </div>
  );
}

export default function Login() {
  const [devName, setDevName] = useState("Developer");
  const [devRole, setDevRole] = useState("admin");
  const [isLoading, setIsLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: devName, role: devRole }),
        credentials: "include",
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
    <div className="min-h-screen flex">
      {/* Left Side - Feature Showcase with Animated Background */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <FloatingShape className="w-72 h-72 bg-white/10 -top-20 -left-20" delay={0} />
          <FloatingShape className="w-96 h-96 bg-white/5 top-1/4 right-0" delay={1} />
          <FloatingShape className="w-64 h-64 bg-white/10 bottom-20 left-1/4" delay={2} />
          <FloatingShape className="w-48 h-48 bg-white/5 top-1/2 left-10" delay={1.5} />
          <FloatingShape className="w-80 h-80 bg-white/10 -bottom-40 -right-20" delay={0.5} />
          
          {/* Gradient Overlay Lines */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo and Tagline */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">EmpowerLink</span>
            </div>
            <p className="text-white/80 text-lg max-w-md">
              The comprehensive healthcare CRM designed for Australian care providers
            </p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-4 my-8">
            <h2 className="text-xl font-semibold text-white mb-6">Everything you need to deliver exceptional care</h2>
            <div className="grid gap-3">
              {features.map((feature, index) => (
                <FeatureCard key={feature.title} feature={feature} index={index} />
              ))}
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="flex items-center gap-8">
            <div>
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-sm text-white/70">Clients Managed</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <p className="text-3xl font-bold text-white">99.9%</p>
              <p className="text-sm text-white/70">Uptime</p>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <p className="text-3xl font-bold text-white">HIPAA</p>
              <p className="text-sm text-white/70">Compliant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden p-6 bg-gradient-to-r from-primary to-primary/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">EmpowerLink</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            {/* Logo for Desktop */}
            <div className="hidden lg:block text-center mb-8">
              <img src={logoImage} alt="EmpowerLink" className="h-12 w-auto mx-auto mb-4" data-testid="img-logo" />
            </div>

            {/* Welcome Text */}
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
              <p className="text-muted-foreground">
                Sign in to access your healthcare CRM dashboard
              </p>
            </div>

            {/* Login Card */}
            <Card className="border-0 shadow-xl bg-card">
              <CardContent className="p-6 space-y-6">
                {/* Zoho Login Button */}
                <a 
                  href={`${API_BASE_URL}/api/auth/zoho`}
                  className="flex items-center justify-center gap-3 w-full h-12 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/25"
                  data-testid="button-zoho-login"
                >
                  <LogIn className="h-5 w-5" />
                  Sign in with Zoho
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </a>

                {/* Features List */}
                <div className="flex items-center justify-center gap-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Fast</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Reliable</span>
                  </div>
                </div>

                {/* Developer Access - Development Only */}
                {isDevelopment && (
                  <>
                    <div className="relative">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground font-medium">
                        Dev Mode
                      </span>
                    </div>

                    <div className="space-y-4 p-4 border border-dashed border-amber-500/50 rounded-xl bg-amber-50/50 dark:bg-amber-900/10">
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
                            className="h-10"
                            data-testid="input-dev-name"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label htmlFor="dev-role" className="text-sm">Role</Label>
                          <Select value={devRole} onValueChange={setDevRole}>
                            <SelectTrigger id="dev-role" className="h-10" data-testid="select-dev-role">
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
                        className="w-full h-10 gap-2 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20"
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
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center space-y-4">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to comply with Australian privacy laws
                and EmpowerLink's data protection policies.
              </p>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>Privacy Policy</span>
                <span>•</span>
                <span>Terms of Service</span>
                <span>•</span>
                <span>Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Brand */}
        <div className="p-6 text-center border-t">
          <p className="text-xs text-muted-foreground">
            © 2024 EmpowerLink. Proudly Australian.
          </p>
        </div>
      </div>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          33% {
            transform: translateY(-20px) rotate(5deg);
          }
          66% {
            transform: translateY(10px) rotate(-3deg);
          }
        }
        .animate-float {
          animation: float 15s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
