import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserCog, Shield, Stethoscope, Users, Briefcase, Heart, ClipboardList, Crown } from "lucide-react";

interface Role {
  value: string;
  label: string;
}

const roleIcons: Record<string, typeof UserCog> = {
  support_worker: Users,
  enrolled_nurse: Heart,
  registered_nurse: Stethoscope,
  admin: ClipboardList,
  operations_manager: Briefcase,
  care_manager: UserCog,
  clinical_manager: Shield,
  director: Crown,
};

export default function SelectRole() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/auth/roles"],
  });

  const saveRolesMutation = useMutation({
    mutationFn: async (roles: string[]) => {
      const response = await apiRequest("POST", "/api/auth/roles", { roles });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Roles saved",
        description: "Your role selection has been saved successfully.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save roles",
        variant: "destructive",
      });
    },
  });

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSubmit = () => {
    if (selectedRoles.length === 0) {
      toast({
        title: "Selection required",
        description: "Please select at least one role",
        variant: "destructive",
      });
      return;
    }
    saveRolesMutation.mutate(selectedRoles);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <UserCog className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Select Your Role(s)</CardTitle>
          <CardDescription>
            Choose the role(s) that apply to you. You can select multiple roles if you have dual responsibilities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => {
              const Icon = roleIcons[role.value] || UserCog;
              const isSelected = selectedRoles.includes(role.value);
              
              return (
                <div
                  key={role.value}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => toggleRole(role.value)}
                  data-testid={`role-option-${role.value}`}
                >
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => toggleRole(role.value)}
                    data-testid={`checkbox-role-${role.value}`}
                  />
                  <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <Label className="cursor-pointer font-medium">{role.label}</Label>
                </div>
              );
            })}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">Role Permissions:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li><strong>Director:</strong> Full access to all features</li>
              <li><strong>Clinical/Operations Manager:</strong> Full access to all features</li>
              <li><strong>Admin:</strong> Full access to all features</li>
              <li><strong>Care Manager:</strong> Client management, reports (no funding/budgets)</li>
              <li><strong>Nurses:</strong> Client management, reports (no funding/budgets)</li>
              <li><strong>Support Worker:</strong> Client management only</li>
            </ul>
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={selectedRoles.length === 0 || saveRolesMutation.isPending}
            className="w-full"
            size="lg"
            data-testid="button-save-roles"
          >
            {saveRolesMutation.isPending ? "Saving..." : "Continue to Dashboard"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
