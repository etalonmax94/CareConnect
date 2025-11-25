import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Send, Check, X, FileText, Search, DollarSign, Clock, Loader2, Save, Download } from "lucide-react";
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

const RATE_TYPES = [
  { value: "weekday", label: "Weekday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
  { value: "public_holiday", label: "Public Holiday" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
];

interface QuoteWithDetails extends Quote {
  lineItems: QuoteLineItem[];
  statusHistory: any[];
}

export default function QuoteEditor() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [priceGuideSearch, setPriceGuideSearch] = useState("");
  const [selectedPriceItem, setSelectedPriceItem] = useState<NdisPriceGuideItem | null>(null);
  const [itemDescription, setItemDescription] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemRateType, setItemRateType] = useState<string>("weekday");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [itemNotes, setItemNotes] = useState("");

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
    enabled: priceGuideSearch.length > 0,
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
      toast({ title: "Line item added" });
    },
  });

  const deleteLineItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/quote-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", params?.id] });
      toast({ title: "Line item removed" });
    },
  });

  const resetItemForm = () => {
    setSelectedPriceItem(null);
    setItemDescription("");
    setItemQuantity("1");
    setItemRateType("weekday");
    setItemUnitPrice("");
    setItemNotes("");
    setPriceGuideSearch("");
  };

  const handleSelectPriceItem = (item: NdisPriceGuideItem) => {
    setSelectedPriceItem(item);
    setItemDescription(item.supportItemName);
    const rate = item.weekdayRate || item.priceLimit || "0";
    setItemUnitPrice(rate);
  };

  const handleRateTypeChange = (rateType: string) => {
    setItemRateType(rateType);
    if (selectedPriceItem) {
      const rateMap: Record<string, string | null> = {
        weekday: selectedPriceItem.weekdayRate,
        saturday: selectedPriceItem.saturdayRate,
        sunday: selectedPriceItem.sundayRate,
        public_holiday: selectedPriceItem.publicHolidayRate,
        evening: selectedPriceItem.eveningRate,
        night: selectedPriceItem.nightRate,
      };
      setItemUnitPrice(rateMap[rateType] || selectedPriceItem.priceLimit || "0");
    }
  };

  const calculateLineTotal = () => {
    const qty = parseFloat(itemQuantity) || 0;
    const price = parseFloat(itemUnitPrice) || 0;
    return (qty * price).toFixed(2);
  };

  const handleAddItem = () => {
    addLineItemMutation.mutate({
      priceGuideItemId: selectedPriceItem?.id,
      supportItemNumber: selectedPriceItem?.supportItemNumber,
      description: itemDescription,
      category: selectedPriceItem?.supportCategory,
      rateType: itemRateType,
      quantity: itemQuantity,
      unit: selectedPriceItem?.unit || "Hour",
      unitPrice: itemUnitPrice,
      lineTotal: calculateLineTotal(),
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                {isEditable && (
                  <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-line-item">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Line Item</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Search NDIS Price Guide</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by item number or name..."
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
                                  className={`p-3 cursor-pointer hover:bg-muted ${selectedPriceItem?.id === item.id ? 'bg-muted' : ''}`}
                                  onClick={() => handleSelectPriceItem(item)}
                                >
                                  <div className="flex justify-between">
                                    <span className="font-medium text-sm">{item.supportItemNumber}</span>
                                    <span className="text-sm">${item.weekdayRate || item.priceLimit}/hr</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{item.supportItemName}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <Label>Description *</Label>
                          <Input
                            value={itemDescription}
                            onChange={(e) => setItemDescription(e.target.value)}
                            placeholder="Service description..."
                            data-testid="input-item-description"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Rate Type</Label>
                            <Select value={itemRateType} onValueChange={handleRateTypeChange}>
                              <SelectTrigger data-testid="select-rate-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RATE_TYPES.map(rt => (
                                  <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={itemQuantity}
                              onChange={(e) => setItemQuantity(e.target.value)}
                              min="0"
                              step="0.5"
                              data-testid="input-item-quantity"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit Price ($)</Label>
                            <Input
                              type="number"
                              value={itemUnitPrice}
                              onChange={(e) => setItemUnitPrice(e.target.value)}
                              min="0"
                              step="0.01"
                              data-testid="input-item-price"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={itemNotes}
                            onChange={(e) => setItemNotes(e.target.value)}
                            placeholder="Optional notes..."
                            data-testid="input-item-notes"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                          <span className="font-medium">Line Total:</span>
                          <span className="text-xl font-bold">${calculateLineTotal()}</span>
                        </div>

                        <Button
                          onClick={handleAddItem}
                          disabled={!itemDescription.trim() || !itemUnitPrice || addLineItemMutation.isPending}
                          className="w-full"
                          data-testid="button-submit-line-item"
                        >
                          {addLineItemMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Add Line Item
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {quote.lineItems && quote.lineItems.length > 0 ? (
                <div className="space-y-3">
                  {quote.lineItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 border rounded-lg"
                      data-testid={`line-item-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {item.supportItemNumber && (
                              <Badge variant="outline" className="text-xs">
                                {item.supportItemNumber}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {RATE_TYPES.find(r => r.value === item.rateType)?.label || "Weekday"}
                            </Badge>
                          </div>
                          <p className="font-medium">{item.description}</p>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                          )}
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} x ${parseFloat(item.unitPrice || "0").toFixed(2)}
                            </p>
                            <p className="font-bold">${parseFloat(item.lineTotal || "0").toFixed(2)}</p>
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
                      </div>
                    </div>
                  ))}

                  <Separator className="my-4" />

                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>${parseFloat(quote.subtotal || "0").toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>GST (NDIS Exempt):</span>
                        <span>$0.00</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>${parseFloat(quote.totalAmount || "0").toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No line items yet</p>
                  {isEditable && (
                    <p className="text-sm text-muted-foreground mt-1">Click "Add Item" to add services</p>
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
                <Label className="text-xs text-muted-foreground">Client</Label>
                <p className="font-medium">{client?.participantName || "Unknown"}</p>
                {client && (
                  <Badge variant="outline" className="mt-1">{client.category}</Badge>
                )}
              </div>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold">${parseFloat(quote.totalAmount || "0").toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Quote Value</p>
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
