import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Trash2, Send, Check, X, FileText, Search, DollarSign, Clock, Loader2, Save, Download, Calendar, Calculator, Info, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Quote, QuoteLineItem, NdisPriceGuideItem, Client } from "@shared/schema";

type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

const STATUS_CONFIG: Record<QuoteStatus, { label: string; icon: JSX.Element; className: string }> = {
  draft: { 
    label: "Draft", 
    icon: <FileText className="w-3 h-3" />, 
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" 
  },
  sent: { 
    label: "Sent", 
    icon: <Send className="w-3 h-3" />, 
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
  },
  accepted: { 
    label: "Accepted", 
    icon: <Check className="w-3 h-3" />, 
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
  },
  declined: { 
    label: "Declined", 
    icon: <X className="w-3 h-3" />, 
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
  },
  expired: { 
    label: "Expired", 
    icon: <Clock className="w-3 h-3" />, 
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
  },
};

const QLD_PUBLIC_HOLIDAYS_2024_2025 = [
  "New Year's Day",
  "Australia Day", 
  "Good Friday",
  "Easter Saturday",
  "Easter Monday",
  "Anzac Day",
  "Queen's Birthday",
  "Royal Queensland Show (Ekka) - Brisbane only",
  "Christmas Day",
  "Boxing Day",
  "Labour Day (Oct)",
  "Additional holidays may vary by region"
];

interface QuoteWithDetails extends Quote {
  lineItems: QuoteLineItem[];
  statusHistory: any[];
}

interface RateBreakdown {
  weekdayHours: string;
  weekdayRate: string;
  saturdayHours: string;
  saturdayRate: string;
  sundayHours: string;
  sundayRate: string;
  publicHolidayHours: string;
  publicHolidayRate: string;
  eveningHours: string;
  eveningRate: string;
  nightHours: string;
  nightRate: string;
}

export default function QuoteEditor() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [priceGuideSearch, setPriceGuideSearch] = useState("");
  const [selectedPriceItem, setSelectedPriceItem] = useState<NdisPriceGuideItem | null>(null);
  
  // Line item form state
  const [itemSupportNumber, setItemSupportNumber] = useState("");
  const [itemSupportName, setItemSupportName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemUnit, setItemUnit] = useState("Hour");
  const [itemNotes, setItemNotes] = useState("");
  
  // Rate breakdown state
  const [rates, setRates] = useState<RateBreakdown>({
    weekdayHours: "0",
    weekdayRate: "0",
    saturdayHours: "0",
    saturdayRate: "0",
    sundayHours: "0",
    sundayRate: "0",
    publicHolidayHours: "0",
    publicHolidayRate: "0",
    eveningHours: "0",
    eveningRate: "0",
    nightHours: "0",
    nightRate: "0",
  });
  
  // Annual calculation state
  const [weeksPerYear, setWeeksPerYear] = useState("52");
  const [includesQldHolidays, setIncludesQldHolidays] = useState(true);
  const [qldHolidayDays, setQldHolidayDays] = useState("12");

  const { data: quote, isLoading } = useQuery<QuoteWithDetails>({
    queryKey: ["/api/quotes", params?.id],
    enabled: !!params?.id,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", quote?.clientId],
    enabled: !!quote?.clientId,
  });

  const { data: priceGuideItems = [] } = useQuery<NdisPriceGuideItem[]>({
    queryKey: ["/api/price-guide/search", priceGuideSearch],
    queryFn: async () => {
      const res = await fetch(`/api/price-guide/search?q=${encodeURIComponent(priceGuideSearch)}`);
      return res.json();
    },
    enabled: priceGuideSearch.length > 1,
  });

  const updateQuoteMutation = useMutation({
    mutationFn: async (data: Partial<Quote>) => {
      return apiRequest("PATCH", `/api/quotes/${params?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Quote updated" });
    },
  });

  const addLineItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/quotes/${params?.id}/items`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", params?.id] });
      setAddItemOpen(false);
      resetItemForm();
      toast({ title: "Service item added to quote" });
    },
  });

  const deleteLineItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/quote-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", params?.id] });
      toast({ title: "Service item removed" });
    },
  });

  const resetItemForm = () => {
    setSelectedPriceItem(null);
    setItemSupportNumber("");
    setItemSupportName("");
    setItemDescription("");
    setItemCategory("");
    setItemUnit("Hour");
    setItemNotes("");
    setPriceGuideSearch("");
    setRates({
      weekdayHours: "0",
      weekdayRate: "0",
      saturdayHours: "0",
      saturdayRate: "0",
      sundayHours: "0",
      sundayRate: "0",
      publicHolidayHours: "0",
      publicHolidayRate: "0",
      eveningHours: "0",
      eveningRate: "0",
      nightHours: "0",
      nightRate: "0",
    });
    setWeeksPerYear("52");
    setIncludesQldHolidays(true);
    setQldHolidayDays("12");
  };

  const handleSelectPriceItem = (item: NdisPriceGuideItem) => {
    setSelectedPriceItem(item);
    setItemSupportNumber(item.supportItemNumber);
    setItemSupportName(item.supportItemName);
    setItemDescription(item.supportItemName);
    setItemCategory(item.supportCategory || "");
    setItemUnit(item.unit || "Hour");
    
    setRates({
      weekdayHours: "0",
      weekdayRate: item.weekdayRate || item.priceLimit || "0",
      saturdayHours: "0",
      saturdayRate: item.saturdayRate || item.weekdayRate || "0",
      sundayHours: "0",
      sundayRate: item.sundayRate || item.weekdayRate || "0",
      publicHolidayHours: "0",
      publicHolidayRate: item.publicHolidayRate || item.weekdayRate || "0",
      eveningHours: "0",
      eveningRate: item.eveningRate || item.weekdayRate || "0",
      nightHours: "0",
      nightRate: item.nightRate || item.weekdayRate || "0",
    });
    
    setPriceGuideSearch("");
  };

  // Calculate weekly and annual totals
  const calculations = useMemo(() => {
    const weekdayTotal = parseFloat(rates.weekdayHours || "0") * parseFloat(rates.weekdayRate || "0");
    const saturdayTotal = parseFloat(rates.saturdayHours || "0") * parseFloat(rates.saturdayRate || "0");
    const sundayTotal = parseFloat(rates.sundayHours || "0") * parseFloat(rates.sundayRate || "0");
    const publicHolidayTotal = parseFloat(rates.publicHolidayHours || "0") * parseFloat(rates.publicHolidayRate || "0");
    const eveningTotal = parseFloat(rates.eveningHours || "0") * parseFloat(rates.eveningRate || "0");
    const nightTotal = parseFloat(rates.nightHours || "0") * parseFloat(rates.nightRate || "0");
    
    // Weekly total includes all rate types
    const weeklyTotal = weekdayTotal + saturdayTotal + sundayTotal + publicHolidayTotal + eveningTotal + nightTotal;
    const weeks = parseFloat(weeksPerYear || "52");
    
    // Base annual total from weekly services
    let annualTotal = weeklyTotal * weeks;
    
    // QLD Holiday adjustment: On public holidays, weekday services are charged at PH rate
    // This calculates the additional cost for 12 public holidays (rate difference x avg weekday hours)
    if (includesQldHolidays && parseFloat(rates.weekdayHours || "0") > 0) {
      const holidayDays = parseFloat(qldHolidayDays || "12");
      const weekdayHoursPerDay = parseFloat(rates.weekdayHours || "0") / 5; // Avg per weekday
      const weekdayRate = parseFloat(rates.weekdayRate || "0");
      const phRate = parseFloat(rates.publicHolidayRate || "0");
      const rateDifference = phRate - weekdayRate;
      
      // Only add the uplift (difference between PH rate and weekday rate)
      if (rateDifference > 0) {
        annualTotal += holidayDays * weekdayHoursPerDay * rateDifference;
      }
    }
    
    const totalWeeklyHours = 
      parseFloat(rates.weekdayHours || "0") + 
      parseFloat(rates.saturdayHours || "0") + 
      parseFloat(rates.sundayHours || "0") +
      parseFloat(rates.eveningHours || "0") +
      parseFloat(rates.nightHours || "0") +
      parseFloat(rates.publicHolidayHours || "0");
    
    return {
      weekdayTotal,
      saturdayTotal,
      sundayTotal,
      publicHolidayTotal,
      eveningTotal,
      nightTotal,
      weeklyTotal,
      annualTotal,
      totalWeeklyHours,
    };
  }, [rates, weeksPerYear, includesQldHolidays, qldHolidayDays]);

  const handleAddItem = () => {
    addLineItemMutation.mutate({
      priceGuideItemId: selectedPriceItem?.id,
      supportItemNumber: itemSupportNumber,
      supportItemName: itemSupportName,
      description: itemDescription,
      category: itemCategory,
      unit: itemUnit,
      weekdayHours: rates.weekdayHours,
      weekdayRate: rates.weekdayRate,
      saturdayHours: rates.saturdayHours,
      saturdayRate: rates.saturdayRate,
      sundayHours: rates.sundayHours,
      sundayRate: rates.sundayRate,
      publicHolidayHours: rates.publicHolidayHours,
      publicHolidayRate: rates.publicHolidayRate,
      eveningHours: rates.eveningHours,
      eveningRate: rates.eveningRate,
      nightHours: rates.nightHours,
      nightRate: rates.nightRate,
      weeksPerYear,
      includesQldHolidays: includesQldHolidays ? "yes" : "no",
      qldHolidayDays,
      weeklyTotal: calculations.weeklyTotal.toFixed(2),
      annualTotal: calculations.annualTotal.toFixed(2),
      lineTotal: calculations.annualTotal.toFixed(2),
      notes: itemNotes || undefined,
    });
  };

  const handleStatusChange = (newStatus: QuoteStatus) => {
    const statusUpdates: Partial<Quote> = { status: newStatus };
    if (newStatus === "sent") {
      statusUpdates.sentAt = new Date();
    } else if (newStatus === "accepted") {
      statusUpdates.acceptedAt = new Date();
    } else if (newStatus === "declined") {
      statusUpdates.declinedAt = new Date();
    }
    updateQuoteMutation.mutate(statusUpdates);
  };

  // Calculate quote totals from all line items
  const quoteTotals = useMemo(() => {
    if (!quote?.lineItems) return { weekly: 0, annual: 0 };
    
    const weekly = quote.lineItems.reduce((sum, item) => sum + parseFloat(item.weeklyTotal || "0"), 0);
    const annual = quote.lineItems.reduce((sum, item) => sum + parseFloat(item.annualTotal || item.lineTotal || "0"), 0);
    
    return { weekly, annual };
  }, [quote?.lineItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Quote not found</p>
        <Link href="/quotes">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[quote.status as QuoteStatus] || STATUS_CONFIG.draft;
  const isEditable = quote.status === "draft";

  return (
    <div className="p-6 space-y-6" data-testid="quote-editor-page">
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
            <Badge variant="secondary" className={`${statusConfig.className} gap-1`}>
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">{quote.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {quote.status === "draft" && (
            <Button onClick={() => handleStatusChange("sent")} data-testid="button-send-quote">
              <Send className="w-4 h-4 mr-2" />
              Send Quote
            </Button>
          )}
          {quote.status === "sent" && (
            <>
              <Button variant="outline" onClick={() => handleStatusChange("declined")} data-testid="button-decline-quote">
                <X className="w-4 h-4 mr-2" />
                Declined
              </Button>
              <Button onClick={() => handleStatusChange("accepted")} data-testid="button-accept-quote">
                <Check className="w-4 h-4 mr-2" />
                Accepted
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Client Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Client Name</Label>
              <p className="font-medium text-lg">{client?.participantName || "Unknown Client"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">NDIS Number</Label>
              <p className="font-medium">{(client?.ndisDetails as any)?.ndisNumber || "N/A"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Badge variant="outline">{client?.category || "Unknown"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">NDIS Service Items</CardTitle>
                  <CardDescription>Add services with detailed pricing for each day type</CardDescription>
                </div>
                {isEditable && (
                  <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-line-item">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Service
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                      <DialogHeader>
                        <DialogTitle>Add NDIS Service Item</DialogTitle>
                        <DialogDescription>
                          Search the NDIS Price Guide or enter service details manually with comprehensive pricing
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                        <div className="space-y-6 py-4">
                          {/* NDIS Price Guide Search */}
                          <div className="space-y-3">
                            <Label className="font-medium">Search NDIS Price Guide</Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="Search by support item number or name..."
                                value={priceGuideSearch}
                                onChange={(e) => setPriceGuideSearch(e.target.value)}
                                className="pl-9"
                                data-testid="input-price-guide-search"
                              />
                            </div>
                            {priceGuideItems.length > 0 && (
                              <div className="max-h-48 overflow-y-auto border rounded-md">
                                {priceGuideItems.map(item => (
                                  <div
                                    key={item.id}
                                    className={`p-3 cursor-pointer hover:bg-muted border-b last:border-b-0 ${selectedPriceItem?.id === item.id ? 'bg-muted' : ''}`}
                                    onClick={() => handleSelectPriceItem(item)}
                                    data-testid={`price-guide-item-${item.id}`}
                                  >
                                    <div className="flex justify-between">
                                      <span className="font-medium text-sm">{item.supportItemNumber}</span>
                                      <span className="text-sm font-medium">${item.weekdayRate || item.priceLimit}/hr</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{item.supportItemName}</p>
                                    {item.supportCategory && (
                                      <Badge variant="secondary" className="mt-1 text-xs">{item.supportCategory}</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Service Details */}
                          <div className="space-y-4">
                            <Label className="font-medium">Service Details</Label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm">Support Item Number</Label>
                                <Input
                                  value={itemSupportNumber}
                                  onChange={(e) => setItemSupportNumber(e.target.value)}
                                  placeholder="e.g., 01_011_0107_1_1"
                                  data-testid="input-support-number"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Category</Label>
                                <Input
                                  value={itemCategory}
                                  onChange={(e) => setItemCategory(e.target.value)}
                                  placeholder="e.g., Core - Assistance with Daily Life"
                                  data-testid="input-category"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Support Item Name</Label>
                              <Input
                                value={itemSupportName}
                                onChange={(e) => setItemSupportName(e.target.value)}
                                placeholder="e.g., Assistance with Self-Care Activities"
                                data-testid="input-support-name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Description (for quote)</Label>
                              <Textarea
                                value={itemDescription}
                                onChange={(e) => setItemDescription(e.target.value)}
                                placeholder="Detailed description of the service..."
                                data-testid="input-item-description"
                              />
                            </div>
                          </div>

                          <Separator />

                          {/* Comprehensive Rate Breakdown */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="font-medium">Rate Breakdown by Day Type</Label>
                              <Badge variant="outline" className="gap-1">
                                <Calculator className="w-3 h-3" />
                                Hours per Week
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                              {/* Weekday */}
                              <div className="grid grid-cols-4 gap-3 items-end p-3 border rounded-lg bg-muted/30">
                                <div className="col-span-1">
                                  <Label className="text-xs text-muted-foreground">Day Type</Label>
                                  <p className="font-medium">Weekday</p>
                                  <p className="text-xs text-muted-foreground">Mon-Fri</p>
                                </div>
                                <div>
                                  <Label className="text-xs">Hours/Week</Label>
                                  <Input
                                    type="number"
                                    value={rates.weekdayHours}
                                    onChange={(e) => setRates({...rates, weekdayHours: e.target.value})}
                                    min="0"
                                    step="0.5"
                                    data-testid="input-weekday-hours"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rate ($/hr)</Label>
                                  <Input
                                    type="number"
                                    value={rates.weekdayRate}
                                    onChange={(e) => setRates({...rates, weekdayRate: e.target.value})}
                                    min="0"
                                    step="0.01"
                                    data-testid="input-weekday-rate"
                                  />
                                </div>
                                <div className="text-right">
                                  <Label className="text-xs text-muted-foreground">Weekly</Label>
                                  <p className="font-bold text-lg">${calculations.weekdayTotal.toFixed(2)}</p>
                                </div>
                              </div>

                              {/* Saturday */}
                              <div className="grid grid-cols-4 gap-3 items-end p-3 border rounded-lg bg-muted/30">
                                <div className="col-span-1">
                                  <Label className="text-xs text-muted-foreground">Day Type</Label>
                                  <p className="font-medium">Saturday</p>
                                </div>
                                <div>
                                  <Label className="text-xs">Hours/Week</Label>
                                  <Input
                                    type="number"
                                    value={rates.saturdayHours}
                                    onChange={(e) => setRates({...rates, saturdayHours: e.target.value})}
                                    min="0"
                                    step="0.5"
                                    data-testid="input-saturday-hours"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rate ($/hr)</Label>
                                  <Input
                                    type="number"
                                    value={rates.saturdayRate}
                                    onChange={(e) => setRates({...rates, saturdayRate: e.target.value})}
                                    min="0"
                                    step="0.01"
                                    data-testid="input-saturday-rate"
                                  />
                                </div>
                                <div className="text-right">
                                  <Label className="text-xs text-muted-foreground">Weekly</Label>
                                  <p className="font-bold text-lg">${calculations.saturdayTotal.toFixed(2)}</p>
                                </div>
                              </div>

                              {/* Sunday */}
                              <div className="grid grid-cols-4 gap-3 items-end p-3 border rounded-lg bg-muted/30">
                                <div className="col-span-1">
                                  <Label className="text-xs text-muted-foreground">Day Type</Label>
                                  <p className="font-medium">Sunday</p>
                                </div>
                                <div>
                                  <Label className="text-xs">Hours/Week</Label>
                                  <Input
                                    type="number"
                                    value={rates.sundayHours}
                                    onChange={(e) => setRates({...rates, sundayHours: e.target.value})}
                                    min="0"
                                    step="0.5"
                                    data-testid="input-sunday-hours"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rate ($/hr)</Label>
                                  <Input
                                    type="number"
                                    value={rates.sundayRate}
                                    onChange={(e) => setRates({...rates, sundayRate: e.target.value})}
                                    min="0"
                                    step="0.01"
                                    data-testid="input-sunday-rate"
                                  />
                                </div>
                                <div className="text-right">
                                  <Label className="text-xs text-muted-foreground">Weekly</Label>
                                  <p className="font-bold text-lg">${calculations.sundayTotal.toFixed(2)}</p>
                                </div>
                              </div>

                              {/* Evening */}
                              <div className="grid grid-cols-4 gap-3 items-end p-3 border rounded-lg bg-muted/30">
                                <div className="col-span-1">
                                  <Label className="text-xs text-muted-foreground">Day Type</Label>
                                  <p className="font-medium">Evening</p>
                                  <p className="text-xs text-muted-foreground">After 8pm</p>
                                </div>
                                <div>
                                  <Label className="text-xs">Hours/Week</Label>
                                  <Input
                                    type="number"
                                    value={rates.eveningHours}
                                    onChange={(e) => setRates({...rates, eveningHours: e.target.value})}
                                    min="0"
                                    step="0.5"
                                    data-testid="input-evening-hours"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rate ($/hr)</Label>
                                  <Input
                                    type="number"
                                    value={rates.eveningRate}
                                    onChange={(e) => setRates({...rates, eveningRate: e.target.value})}
                                    min="0"
                                    step="0.01"
                                    data-testid="input-evening-rate"
                                  />
                                </div>
                                <div className="text-right">
                                  <Label className="text-xs text-muted-foreground">Weekly</Label>
                                  <p className="font-bold text-lg">${calculations.eveningTotal.toFixed(2)}</p>
                                </div>
                              </div>

                              {/* Night */}
                              <div className="grid grid-cols-4 gap-3 items-end p-3 border rounded-lg bg-muted/30">
                                <div className="col-span-1">
                                  <Label className="text-xs text-muted-foreground">Day Type</Label>
                                  <p className="font-medium">Night</p>
                                  <p className="text-xs text-muted-foreground">After 11pm</p>
                                </div>
                                <div>
                                  <Label className="text-xs">Hours/Week</Label>
                                  <Input
                                    type="number"
                                    value={rates.nightHours}
                                    onChange={(e) => setRates({...rates, nightHours: e.target.value})}
                                    min="0"
                                    step="0.5"
                                    data-testid="input-night-hours"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rate ($/hr)</Label>
                                  <Input
                                    type="number"
                                    value={rates.nightRate}
                                    onChange={(e) => setRates({...rates, nightRate: e.target.value})}
                                    min="0"
                                    step="0.01"
                                    data-testid="input-night-rate"
                                  />
                                </div>
                                <div className="text-right">
                                  <Label className="text-xs text-muted-foreground">Weekly</Label>
                                  <p className="font-bold text-lg">${calculations.nightTotal.toFixed(2)}</p>
                                </div>
                              </div>

                              {/* Public Holiday */}
                              <div className="grid grid-cols-4 gap-3 items-end p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                                <div className="col-span-1">
                                  <Label className="text-xs text-muted-foreground">Day Type</Label>
                                  <p className="font-medium">Public Holiday</p>
                                  <p className="text-xs text-muted-foreground">Scheduled shifts</p>
                                </div>
                                <div>
                                  <Label className="text-xs">Hours/Week</Label>
                                  <Input
                                    type="number"
                                    value={rates.publicHolidayHours}
                                    onChange={(e) => setRates({...rates, publicHolidayHours: e.target.value})}
                                    min="0"
                                    step="0.5"
                                    data-testid="input-holiday-hours"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Rate ($/hr)</Label>
                                  <Input
                                    type="number"
                                    value={rates.publicHolidayRate}
                                    onChange={(e) => setRates({...rates, publicHolidayRate: e.target.value})}
                                    min="0"
                                    step="0.01"
                                    data-testid="input-holiday-rate"
                                  />
                                </div>
                                <div className="text-right">
                                  <Label className="text-xs text-muted-foreground">Weekly</Label>
                                  <p className="font-bold text-lg">${calculations.publicHolidayTotal.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <Separator />

                          {/* Annual Calculation Settings */}
                          <div className="space-y-4">
                            <Label className="font-medium">Annual Calculation Settings</Label>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm">Weeks per Year</Label>
                                <Select value={weeksPerYear} onValueChange={setWeeksPerYear}>
                                  <SelectTrigger data-testid="select-weeks-per-year">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="48">48 weeks (excl. 4 weeks leave)</SelectItem>
                                    <SelectItem value="50">50 weeks (excl. 2 weeks leave)</SelectItem>
                                    <SelectItem value="52">52 weeks (full year)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">QLD Public Holidays/Year</Label>
                                <Input
                                  type="number"
                                  value={qldHolidayDays}
                                  onChange={(e) => setQldHolidayDays(e.target.value)}
                                  min="0"
                                  max="20"
                                  disabled={!includesQldHolidays}
                                  data-testid="input-qld-holiday-days"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                              <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-amber-600" />
                                <div>
                                  <p className="font-medium">Include QLD Public Holiday Uplift</p>
                                  <p className="text-xs text-muted-foreground">
                                    When a weekday falls on a public holiday, the rate difference is added to annual total
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={includesQldHolidays}
                                onCheckedChange={setIncludesQldHolidays}
                                data-testid="switch-qld-holidays"
                              />
                            </div>

                            {includesQldHolidays && (
                              <div className="p-3 border rounded-lg bg-muted/30">
                                <p className="text-xs font-medium mb-2">QLD Public Holidays include:</p>
                                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                                  {QLD_PUBLIC_HOLIDAYS_2024_2025.map((holiday, i) => (
                                    <span key={i}>• {holiday}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Notes */}
                          <div className="space-y-2">
                            <Label className="text-sm">Additional Notes</Label>
                            <Textarea
                              value={itemNotes}
                              onChange={(e) => setItemNotes(e.target.value)}
                              placeholder="Any additional notes for this service item..."
                              data-testid="input-item-notes"
                            />
                          </div>

                          {/* Calculation Summary */}
                          <div className="p-4 border rounded-lg bg-primary/5 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Total Weekly Hours:</span>
                              <span className="font-medium">{calculations.totalWeeklyHours.toFixed(1)} hrs</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Weekly Total:</span>
                              <span className="font-bold text-lg">${calculations.weeklyTotal.toFixed(2)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Annual Total ({weeksPerYear} weeks):</span>
                              <span className="font-bold text-2xl text-primary">${calculations.annualTotal.toFixed(2)}</span>
                            </div>
                            {includesQldHolidays && (
                              <p className="text-xs text-muted-foreground">
                                * Includes {qldHolidayDays} QLD public holidays at public holiday rate
                              </p>
                            )}
                          </div>

                          <Button
                            onClick={handleAddItem}
                            disabled={!itemDescription.trim() || calculations.totalWeeklyHours === 0 || addLineItemMutation.isPending}
                            className="w-full"
                            size="lg"
                            data-testid="button-submit-line-item"
                          >
                            {addLineItemMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Add Service Item (${calculations.annualTotal.toFixed(2)}/year)
                          </Button>
                          {calculations.totalWeeklyHours === 0 && itemDescription.trim() && (
                            <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                              <AlertCircle className="w-3 h-3" />
                              Enter at least one hour for any rate type to add this item
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {quote.lineItems && quote.lineItems.length > 0 ? (
                <div className="space-y-4">
                  {quote.lineItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden" data-testid={`line-item-${item.id}`}>
                      <CardHeader className="pb-2 bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div>
                            {item.supportItemNumber && (
                              <Badge variant="outline" className="mb-1">{item.supportItemNumber}</Badge>
                            )}
                            <CardTitle className="text-base">{item.supportItemName || item.description}</CardTitle>
                            {item.category && (
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            )}
                          </div>
                          {isEditable && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteLineItemMutation.mutate(item.id)}
                              data-testid={`button-delete-item-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                          {parseFloat(item.weekdayHours || "0") > 0 && (
                            <div className="p-2 border rounded bg-muted/20">
                              <p className="text-xs text-muted-foreground">Weekday</p>
                              <p className="font-medium">{item.weekdayHours} hrs @ ${item.weekdayRate}</p>
                            </div>
                          )}
                          {parseFloat(item.saturdayHours || "0") > 0 && (
                            <div className="p-2 border rounded bg-muted/20">
                              <p className="text-xs text-muted-foreground">Saturday</p>
                              <p className="font-medium">{item.saturdayHours} hrs @ ${item.saturdayRate}</p>
                            </div>
                          )}
                          {parseFloat(item.sundayHours || "0") > 0 && (
                            <div className="p-2 border rounded bg-muted/20">
                              <p className="text-xs text-muted-foreground">Sunday</p>
                              <p className="font-medium">{item.sundayHours} hrs @ ${item.sundayRate}</p>
                            </div>
                          )}
                          {parseFloat(item.eveningHours || "0") > 0 && (
                            <div className="p-2 border rounded bg-muted/20">
                              <p className="text-xs text-muted-foreground">Evening</p>
                              <p className="font-medium">{item.eveningHours} hrs @ ${item.eveningRate}</p>
                            </div>
                          )}
                          {parseFloat(item.nightHours || "0") > 0 && (
                            <div className="p-2 border rounded bg-muted/20">
                              <p className="text-xs text-muted-foreground">Night</p>
                              <p className="font-medium">{item.nightHours} hrs @ ${item.nightRate}</p>
                            </div>
                          )}
                          {parseFloat(item.publicHolidayHours || "0") > 0 && (
                            <div className="p-2 border rounded bg-amber-50 dark:bg-amber-900/20">
                              <p className="text-xs text-muted-foreground">Public Holiday</p>
                              <p className="font-medium">{item.publicHolidayHours} hrs @ ${item.publicHolidayRate}</p>
                            </div>
                          )}
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">{item.weeksPerYear || "52"} weeks/year</span>
                            {item.includesQldHolidays === "yes" && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Calendar className="w-3 h-3" />
                                QLD Holidays ({item.qldHolidayDays || "12"} days)
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Weekly: ${parseFloat(item.weeklyTotal || "0").toFixed(2)}
                            </p>
                            <p className="font-bold text-lg">
                              Annual: ${parseFloat(item.annualTotal || item.lineTotal || "0").toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {item.notes && (
                          <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                            {item.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  <Separator className="my-6" />

                  {/* Quote Totals */}
                  <div className="flex justify-end">
                    <Card className="w-80">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Weekly Total:</span>
                          <span className="font-medium">${quoteTotals.weekly.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>GST (NDIS Exempt):</span>
                          <span>$0.00</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-xl">
                          <span>Annual Total:</span>
                          <span className="text-primary">${quoteTotals.annual.toLocaleString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calculator className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No service items added yet</p>
                  {isEditable && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Add Service" to add NDIS services with detailed pricing
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Quote Number</Label>
                <p className="font-medium">{quote.quoteNumber}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="font-medium">{new Date(quote.createdAt).toLocaleDateString('en-AU')}</p>
              </div>
              {quote.validUntil && (
                <div>
                  <Label className="text-xs text-muted-foreground">Valid Until</Label>
                  <p className="font-medium">{new Date(quote.validUntil).toLocaleDateString('en-AU')}</p>
                </div>
              )}
              {quote.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm">{quote.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Quote Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Services:</span>
                  <span>{quote.lineItems?.length || 0} items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Weekly:</span>
                  <span>${quoteTotals.weekly.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">Annual Total</p>
                  <p className="text-3xl font-bold text-primary">${quoteTotals.annual.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">GST Exempt (NDIS)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {quote.status === "accepted" && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Quote Accepted</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                  This quote can be converted to budget allocations
                </p>
                <Button 
                  className="w-full mt-3" 
                  variant="outline"
                  onClick={() => {
                    toast({ title: "Feature coming soon", description: "Quote to budget conversion will be available soon" });
                  }}
                  data-testid="button-convert-to-budget"
                >
                  Convert to Budget
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
