import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings as SettingsIcon, MapPin, FileText, Bell, Shield, Building2, Save, Loader2, Calculator, FileCheck2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingsData {
  officeAddress?: string;
  officeLat?: number;
  officeLon?: number;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  reportPreferences?: {
    includeAgeDemo: boolean;
    includeIncidents: boolean;
    includeBudgets: boolean;
    includeMissingDocs: boolean;
    includeDistance: boolean;
  };
  notificationPreferences?: {
    emailNotifications: boolean;
    documentReminders: boolean;
    complianceAlerts: boolean;
  };
  privacySettings?: {
    dataRetentionDays: number;
    auditLogging: boolean;
    encryptSensitiveData: boolean;
  };
  quoteSettings?: {
    showWeekdayRate: boolean;
    showSaturdayRate: boolean;
    showSundayRate: boolean;
    showPublicHolidayRate: boolean;
    showEveningRate: boolean;
    showNightRate: boolean;
    defaultWeeksPerYear: number;
    enableQldPublicHolidayUplift: boolean;
    defaultTermsAndConditions: string;
    defaultPaymentTerms: string;
    defaultValidityDays: number;
    requireNdisCodeForNdis: boolean;
    quoteNumberPrefix: string;
  };
}

export default function Settings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  const { data: settings = {} } = useQuery<SettingsData>({
    queryKey: ["/api/settings"],
  });

  const [formData, setFormData] = useState<SettingsData>({
    officeAddress: "9/73-75 King Street, Caboolture QLD 4510",
    officeLat: -27.0847,
    officeLon: 152.9511,
    companyName: "Healthcare CRM",
    companyPhone: "",
    companyEmail: "",
    reportPreferences: {
      includeAgeDemo: true,
      includeIncidents: true,
      includeBudgets: true,
      includeMissingDocs: true,
      includeDistance: true,
    },
    notificationPreferences: {
      emailNotifications: true,
      documentReminders: true,
      complianceAlerts: true,
    },
    privacySettings: {
      dataRetentionDays: 2555,
      auditLogging: true,
      encryptSensitiveData: true,
    },
    quoteSettings: {
      showWeekdayRate: true,
      showSaturdayRate: true,
      showSundayRate: true,
      showPublicHolidayRate: true,
      showEveningRate: true,
      showNightRate: true,
      defaultWeeksPerYear: 48,
      enableQldPublicHolidayUplift: true,
      defaultTermsAndConditions: "Services provided under this quote are subject to the National Disability Insurance Scheme (NDIS) Terms of Business and our Service Agreement. Rates quoted are GST-exempt for NDIS participants.",
      defaultPaymentTerms: "Payment due within 14 days of invoice date. NDIS participants will be billed directly through the NDIA portal.",
      defaultValidityDays: 30,
      requireNdisCodeForNdis: true,
      quoteNumberPrefix: "Q",
    },
    ...settings,
  });

  const saveSetting = async (key: string, value: any) => {
    await apiRequest("PUT", `/api/settings/${key}`, { value });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        saveSetting("officeAddress", formData.officeAddress),
        saveSetting("officeLat", formData.officeLat),
        saveSetting("officeLon", formData.officeLon),
        saveSetting("companyName", formData.companyName),
        saveSetting("companyPhone", formData.companyPhone),
        saveSetting("companyEmail", formData.companyEmail),
        saveSetting("reportPreferences", formData.reportPreferences),
        saveSetting("notificationPreferences", formData.notificationPreferences),
        saveSetting("privacySettings", formData.privacySettings),
        saveSetting("quoteSettings", formData.quoteSettings),
      ]);
      
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your CRM preferences and company information
          </p>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving} data-testid="button-save-settings">
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save All Settings
        </Button>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company" data-testid="tab-company">
            <Building2 className="w-4 h-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="location" data-testid="tab-location">
            <MapPin className="w-4 h-4 mr-2" />
            Office Location
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" data-testid="tab-privacy">
            <Shield className="w-4 h-4 mr-2" />
            Privacy & Compliance
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes">
            <FileCheck2 className="w-4 h-4 mr-2" />
            Quotes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName || ""}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Your Company Name"
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone Number</Label>
                  <Input
                    id="companyPhone"
                    value={formData.companyPhone || ""}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                    placeholder="(07) 1234 5678"
                    data-testid="input-company-phone"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyEmail">Email Address</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={formData.companyEmail || ""}
                    onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                    placeholder="admin@company.com.au"
                    data-testid="input-company-email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle>Office Location</CardTitle>
              <CardDescription>
                Set your office location for distance calculations in reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="officeAddress">Office Address</Label>
                <Input
                  id="officeAddress"
                  value={formData.officeAddress || ""}
                  onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                  placeholder="Enter your office address"
                  data-testid="input-office-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="officeLat">Latitude</Label>
                  <Input
                    id="officeLat"
                    type="number"
                    step="0.0001"
                    value={formData.officeLat || ""}
                    onChange={(e) => setFormData({ ...formData, officeLat: parseFloat(e.target.value) })}
                    placeholder="-27.0847"
                    data-testid="input-office-lat"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officeLon">Longitude</Label>
                  <Input
                    id="officeLon"
                    type="number"
                    step="0.0001"
                    value={formData.officeLon || ""}
                    onChange={(e) => setFormData({ ...formData, officeLon: parseFloat(e.target.value) })}
                    placeholder="152.9511"
                    data-testid="input-office-lon"
                  />
                </div>
              </div>
              <div className="h-48 bg-muted rounded-lg overflow-hidden">
                <iframe
                  title="Office Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(formData.officeAddress || "Caboolture QLD")}`}
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Report Preferences</CardTitle>
              <CardDescription>
                Select which reports to include in your reporting dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Age Demographics</p>
                  <p className="text-sm text-muted-foreground">Include age distribution charts in reports</p>
                </div>
                <Switch
                  checked={formData.reportPreferences?.includeAgeDemo ?? true}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      reportPreferences: { ...formData.reportPreferences!, includeAgeDemo: checked }
                    })
                  }
                  data-testid="switch-age-demo"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Incident Reports</p>
                  <p className="text-sm text-muted-foreground">Include incident trend graphs</p>
                </div>
                <Switch
                  checked={formData.reportPreferences?.includeIncidents ?? true}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      reportPreferences: { ...formData.reportPreferences!, includeIncidents: checked }
                    })
                  }
                  data-testid="switch-incidents"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Budget Reports</p>
                  <p className="text-sm text-muted-foreground">Include budget allocation and usage</p>
                </div>
                <Switch
                  checked={formData.reportPreferences?.includeBudgets ?? true}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      reportPreferences: { ...formData.reportPreferences!, includeBudgets: checked }
                    })
                  }
                  data-testid="switch-budgets"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Missing Documents</p>
                  <p className="text-sm text-muted-foreground">Include document compliance reports</p>
                </div>
                <Switch
                  checked={formData.reportPreferences?.includeMissingDocs ?? true}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      reportPreferences: { ...formData.reportPreferences!, includeMissingDocs: checked }
                    })
                  }
                  data-testid="switch-missing-docs"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Distance from Office</p>
                  <p className="text-sm text-muted-foreground">Include client distance calculations</p>
                </div>
                <Switch
                  checked={formData.reportPreferences?.includeDistance ?? true}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      reportPreferences: { ...formData.reportPreferences!, includeDistance: checked }
                    })
                  }
                  data-testid="switch-distance"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you receive alerts and reminders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive system notifications via email</p>
                </div>
                <Switch
                  checked={formData.notificationPreferences?.emailNotifications ?? true}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      notificationPreferences: { ...formData.notificationPreferences!, emailNotifications: checked }
                    })
                  }
                  data-testid="switch-email-notifications"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Document Reminders</p>
                  <p className="text-sm text-muted-foreground">Get reminded about upcoming document renewals</p>
                </div>
                <Switch
                  checked={formData.notificationPreferences?.documentReminders ?? true}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      notificationPreferences: { ...formData.notificationPreferences!, documentReminders: checked }
                    })
                  }
                  data-testid="switch-doc-reminders"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compliance Alerts</p>
                  <p className="text-sm text-muted-foreground">Receive alerts for compliance issues</p>
                </div>
                <Switch
                  checked={formData.notificationPreferences?.complianceAlerts ?? true}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      notificationPreferences: { ...formData.notificationPreferences!, complianceAlerts: checked }
                    })
                  }
                  data-testid="switch-compliance-alerts"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Compliance Settings</CardTitle>
              <CardDescription>
                Configure settings to comply with Australian Privacy Principles (APPs)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100">Australian Privacy Compliance</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  This CRM is designed to comply with the Privacy Act 1988 and Australian Privacy Principles. 
                  Client data is stored securely and access is logged for audit purposes.
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Audit Logging</p>
                  <p className="text-sm text-muted-foreground">Log all data access and modifications</p>
                </div>
                <Switch
                  checked={formData.privacySettings?.auditLogging ?? true}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      privacySettings: { ...formData.privacySettings!, auditLogging: checked }
                    })
                  }
                  data-testid="switch-audit-logging"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Encrypt Sensitive Data</p>
                  <p className="text-sm text-muted-foreground">Enable encryption for sensitive client information</p>
                </div>
                <Switch
                  checked={formData.privacySettings?.encryptSensitiveData ?? true}
                  onCheckedChange={(checked) => 
                    setFormData({
                      ...formData,
                      privacySettings: { ...formData.privacySettings!, encryptSensitiveData: checked }
                    })
                  }
                  data-testid="switch-encryption"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataRetention">Data Retention Period (days)</Label>
                <Input
                  id="dataRetention"
                  type="number"
                  value={formData.privacySettings?.dataRetentionDays || 2555}
                  onChange={(e) => 
                    setFormData({
                      ...formData,
                      privacySettings: { ...formData.privacySettings!, dataRetentionDays: parseInt(e.target.value) }
                    })
                  }
                  placeholder="2555 (7 years)"
                  data-testid="input-data-retention"
                />
                <p className="text-xs text-muted-foreground">
                  NDIS and healthcare records typically require 7-year retention (2555 days)
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-900 dark:text-amber-100">Privacy Notice</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  All client data collection, use, and disclosure must comply with consent obtained. 
                  Ensure privacy consent forms are signed before entering client data.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Rate Column Display</CardTitle>
                <CardDescription>
                  Choose which rate columns appear by default on new quotes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Weekday Rate</p>
                      <p className="text-sm text-muted-foreground">Mon-Fri standard hours</p>
                    </div>
                    <Switch
                      checked={formData.quoteSettings?.showWeekdayRate ?? true}
                      onCheckedChange={(checked) => 
                        setFormData({
                          ...formData,
                          quoteSettings: { ...formData.quoteSettings!, showWeekdayRate: checked }
                        })
                      }
                      data-testid="switch-weekday-rate"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Saturday Rate</p>
                      <p className="text-sm text-muted-foreground">Saturday penalty rates</p>
                    </div>
                    <Switch
                      checked={formData.quoteSettings?.showSaturdayRate ?? true}
                      onCheckedChange={(checked) => 
                        setFormData({
                          ...formData,
                          quoteSettings: { ...formData.quoteSettings!, showSaturdayRate: checked }
                        })
                      }
                      data-testid="switch-saturday-rate"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Sunday Rate</p>
                      <p className="text-sm text-muted-foreground">Sunday penalty rates</p>
                    </div>
                    <Switch
                      checked={formData.quoteSettings?.showSundayRate ?? true}
                      onCheckedChange={(checked) => 
                        setFormData({
                          ...formData,
                          quoteSettings: { ...formData.quoteSettings!, showSundayRate: checked }
                        })
                      }
                      data-testid="switch-sunday-rate"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Public Holiday Rate</p>
                      <p className="text-sm text-muted-foreground">Public holiday penalty rates</p>
                    </div>
                    <Switch
                      checked={formData.quoteSettings?.showPublicHolidayRate ?? true}
                      onCheckedChange={(checked) => 
                        setFormData({
                          ...formData,
                          quoteSettings: { ...formData.quoteSettings!, showPublicHolidayRate: checked }
                        })
                      }
                      data-testid="switch-public-holiday-rate"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Evening Rate</p>
                      <p className="text-sm text-muted-foreground">Evening hours (after 6pm)</p>
                    </div>
                    <Switch
                      checked={formData.quoteSettings?.showEveningRate ?? true}
                      onCheckedChange={(checked) => 
                        setFormData({
                          ...formData,
                          quoteSettings: { ...formData.quoteSettings!, showEveningRate: checked }
                        })
                      }
                      data-testid="switch-evening-rate"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Night Rate</p>
                      <p className="text-sm text-muted-foreground">Overnight hours (after 9pm)</p>
                    </div>
                    <Switch
                      checked={formData.quoteSettings?.showNightRate ?? true}
                      onCheckedChange={(checked) => 
                        setFormData({
                          ...formData,
                          quoteSettings: { ...formData.quoteSettings!, showNightRate: checked }
                        })
                      }
                      data-testid="switch-night-rate"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Annual Calculation Defaults</CardTitle>
                <CardDescription>
                  Default settings for annual quote calculations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weeksPerYear">Default Weeks Per Year</Label>
                    <Select 
                      value={String(formData.quoteSettings?.defaultWeeksPerYear ?? 48)}
                      onValueChange={(v) => 
                        setFormData({
                          ...formData,
                          quoteSettings: { ...formData.quoteSettings!, defaultWeeksPerYear: parseInt(v) }
                        })
                      }
                    >
                      <SelectTrigger id="weeksPerYear" data-testid="select-weeks-per-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="48">48 weeks (accounts for holidays)</SelectItem>
                        <SelectItem value="50">50 weeks</SelectItem>
                        <SelectItem value="52">52 weeks (full year)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      48 weeks is recommended to account for annual leave and public holidays
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validityDays">Quote Validity Period (days)</Label>
                    <Input
                      id="validityDays"
                      type="number"
                      value={formData.quoteSettings?.defaultValidityDays ?? 30}
                      onChange={(e) => 
                        setFormData({
                          ...formData,
                          quoteSettings: { ...formData.quoteSettings!, defaultValidityDays: parseInt(e.target.value) || 30 }
                        })
                      }
                      placeholder="30"
                      data-testid="input-validity-days"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">QLD Public Holiday Uplift</p>
                    <p className="text-sm text-muted-foreground">
                      Add rate difference for 12 QLD public holidays to annual calculation
                    </p>
                  </div>
                  <Switch
                    checked={formData.quoteSettings?.enableQldPublicHolidayUplift ?? true}
                    onCheckedChange={(checked) => 
                      setFormData({
                        ...formData,
                        quoteSettings: { ...formData.quoteSettings!, enableQldPublicHolidayUplift: checked }
                      })
                    }
                    data-testid="switch-qld-uplift"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quote Numbering</CardTitle>
                <CardDescription>
                  Configure how quote numbers are generated
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quotePrefix">Quote Number Prefix</Label>
                  <Input
                    id="quotePrefix"
                    value={formData.quoteSettings?.quoteNumberPrefix ?? "Q"}
                    onChange={(e) => 
                      setFormData({
                        ...formData,
                        quoteSettings: { ...formData.quoteSettings!, quoteNumberPrefix: e.target.value }
                      })
                    }
                    placeholder="Q"
                    className="max-w-xs"
                    data-testid="input-quote-prefix"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quote numbers will be formatted as: {formData.quoteSettings?.quoteNumberPrefix || "Q"}2025-0001
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Require NDIS Support Item Code</p>
                    <p className="text-sm text-muted-foreground">
                      Make NDIS support item code mandatory for NDIS client quotes
                    </p>
                  </div>
                  <Switch
                    checked={formData.quoteSettings?.requireNdisCodeForNdis ?? true}
                    onCheckedChange={(checked) => 
                      setFormData({
                        ...formData,
                        quoteSettings: { ...formData.quoteSettings!, requireNdisCodeForNdis: checked }
                      })
                    }
                    data-testid="switch-require-ndis-code"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Default Quote Content</CardTitle>
                <CardDescription>
                  Set default terms and conditions that appear on new quotes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
                  <Textarea
                    id="termsAndConditions"
                    value={formData.quoteSettings?.defaultTermsAndConditions ?? ""}
                    onChange={(e) => 
                      setFormData({
                        ...formData,
                        quoteSettings: { ...formData.quoteSettings!, defaultTermsAndConditions: e.target.value }
                      })
                    }
                    placeholder="Enter default terms and conditions..."
                    className="min-h-[100px]"
                    data-testid="textarea-terms"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Textarea
                    id="paymentTerms"
                    value={formData.quoteSettings?.defaultPaymentTerms ?? ""}
                    onChange={(e) => 
                      setFormData({
                        ...formData,
                        quoteSettings: { ...formData.quoteSettings!, defaultPaymentTerms: e.target.value }
                      })
                    }
                    placeholder="Enter default payment terms..."
                    className="min-h-[80px]"
                    data-testid="textarea-payment-terms"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Multi-Category Support</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Quotes automatically adapt based on client category. NDIS Support Item codes are hidden 
                for Support at Home and Private clients, and terms can be customized per quote.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
