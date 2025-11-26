import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Quote, QuoteLineItem, Client } from '@shared/schema';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #1e3a5f',
    paddingBottom: 20,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 5,
  },
  companyTagline: {
    fontSize: 10,
    color: '#666666',
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333333',
  },
  quoteNumber: {
    fontSize: 12,
    color: '#1e3a5f',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e3a5f',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1 solid #e0e0e0',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 120,
    color: '#666666',
  },
  value: {
    flex: 1,
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #e0e0e0',
    padding: 8,
    fontSize: 9,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1 solid #e0e0e0',
    padding: 8,
    fontSize: 9,
    backgroundColor: '#f8f9fa',
  },
  col1: { width: '35%' },
  col2: { width: '20%' },
  col3: { width: '25%' },
  col4: { width: '20%', textAlign: 'right' },
  rateBreakdown: {
    marginTop: 5,
    paddingLeft: 10,
    fontSize: 8,
    color: '#666666',
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: 250,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    color: '#666666',
  },
  totalValue: {
    fontWeight: 'bold',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '2 solid #1e3a5f',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1 solid #e0e0e0',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#999999',
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    padding: '4 8',
    borderRadius: 3,
    fontSize: 9,
    marginLeft: 10,
  },
  validUntil: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 5,
    fontSize: 9,
  },
  notes: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    fontSize: 9,
    fontStyle: 'italic',
  },
  gstNote: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'right',
    marginTop: 5,
  },
});

interface QuotePDFProps {
  quote: Quote & { lineItems?: QuoteLineItem[] };
  client: Client | null;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
}

export function QuotePDF({ 
  quote, 
  client,
  companyName = "EmpowerLink Care Services",
  companyAddress = "123 Care Street, Caboolture QLD 4510",
  companyPhone = "1300 EMPOWER",
  companyEmail = "info@empowerlink.au"
}: QuotePDFProps) {
  const isNdisClient = client?.category === "NDIS";
  
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const calculateWeeklyTotal = () => {
    if (!quote.lineItems) return 0;
    return quote.lineItems.reduce((sum, item) => {
      return sum + parseFloat(item.weeklyTotal || "0");
    }, 0);
  };

  const calculateAnnualTotal = () => {
    if (!quote.lineItems) return 0;
    return quote.lineItems.reduce((sum, item) => {
      return sum + parseFloat(item.annualTotal || item.lineTotal || "0");
    }, 0);
  };

  const getRateBreakdown = (item: QuoteLineItem) => {
    const parts: string[] = [];
    if (parseFloat(item.weekdayHours || "0") > 0) {
      parts.push(`Weekday: ${item.weekdayHours}hrs @ $${item.weekdayRate}`);
    }
    if (parseFloat(item.saturdayHours || "0") > 0) {
      parts.push(`Sat: ${item.saturdayHours}hrs @ $${item.saturdayRate}`);
    }
    if (parseFloat(item.sundayHours || "0") > 0) {
      parts.push(`Sun: ${item.sundayHours}hrs @ $${item.sundayRate}`);
    }
    if (parseFloat(item.publicHolidayHours || "0") > 0) {
      parts.push(`PH: ${item.publicHolidayHours}hrs @ $${item.publicHolidayRate}`);
    }
    if (parseFloat(item.eveningHours || "0") > 0) {
      parts.push(`Eve: ${item.eveningHours}hrs @ $${item.eveningRate}`);
    }
    if (parseFloat(item.nightHours || "0") > 0) {
      parts.push(`Night: ${item.nightHours}hrs @ $${item.nightRate}`);
    }
    return parts.join(' | ');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.companyTagline}>
            {isNdisClient ? "NDIS Registered Provider | " : "Care Services Provider | "}
            ABN XX XXX XXX XXX
          </Text>
          <Text style={styles.quoteTitle}>{quote.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
            <Text style={styles.quoteNumber}>{quote.quoteNumber}</Text>
            <Text style={styles.statusBadge}>{quote.status?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{isNdisClient ? "Participant Name:" : "Client Name:"}</Text>
            <Text style={styles.value}>{client?.participantName || 'Unknown Client'}</Text>
          </View>
          {isNdisClient ? (
            <View style={styles.row}>
              <Text style={styles.label}>NDIS Number:</Text>
              <Text style={styles.value}>{(client?.ndisDetails as any)?.ndisNumber || 'N/A'}</Text>
            </View>
          ) : client?.category === "Support at Home" ? (
            <View style={styles.row}>
              <Text style={styles.label}>HCP Number:</Text>
              <Text style={styles.value}>{(client?.supportAtHomeDetails as any)?.hcpNumber || 'N/A'}</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.label}>Client Reference:</Text>
              <Text style={styles.value}>{client?.medicareNumber || 'N/A'}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Category:</Text>
            <Text style={styles.value}>{client?.category || 'N/A'}</Text>
          </View>
          {client?.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{client.email}</Text>
            </View>
          )}
          {client?.phoneNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{client.phoneNumber}</Text>
            </View>
          )}
        </View>

        {/* Quote Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Quote Date:</Text>
            <Text style={styles.value}>{formatDate(quote.createdAt)}</Text>
          </View>
          {quote.validUntil && (
            <View style={styles.row}>
              <Text style={styles.label}>Valid Until:</Text>
              <Text style={styles.value}>{formatDate(quote.validUntil)}</Text>
            </View>
          )}
          {quote.description && (
            <View style={{ marginTop: 5 }}>
              <Text style={styles.label}>Description:</Text>
              <Text style={{ marginTop: 3 }}>{quote.description}</Text>
            </View>
          )}
        </View>

        {/* Service Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={isNdisClient ? styles.col1 : { width: '40%' }}>Service Description</Text>
              {isNdisClient && <Text style={styles.col2}>Support Item</Text>}
              <Text style={isNdisClient ? styles.col3 : { width: '35%' }}>Rate Breakdown</Text>
              <Text style={styles.col4}>Annual Total</Text>
            </View>
            {quote.lineItems?.map((item, index) => (
              <View key={item.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <View style={isNdisClient ? styles.col1 : { width: '40%' }}>
                  <Text>{item.supportItemName || item.description}</Text>
                  {item.notes && (
                    <Text style={styles.rateBreakdown}>{item.notes}</Text>
                  )}
                </View>
                {isNdisClient && <Text style={styles.col2}>{item.supportItemNumber || '-'}</Text>}
                <View style={isNdisClient ? styles.col3 : { width: '35%' }}>
                  <Text style={{ fontSize: 8 }}>{getRateBreakdown(item)}</Text>
                  <Text style={{ fontSize: 8, marginTop: 2, color: '#666' }}>
                    Weekly: {formatCurrency(item.weeklyTotal || "0")}
                  </Text>
                </View>
                <Text style={styles.col4}>
                  {formatCurrency(item.annualTotal || item.lineTotal || "0")}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Weekly Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(calculateWeeklyTotal())}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {isNdisClient ? "GST (NDIS Exempt):" : "GST:"}
            </Text>
            <Text style={styles.totalValue}>$0.00</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Annual Total:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(calculateAnnualTotal())}</Text>
          </View>
          {isNdisClient && (
            <Text style={styles.gstNote}>* All NDIS services are GST exempt</Text>
          )}
        </View>

        {/* Valid Until Notice */}
        {quote.validUntil && (
          <View style={styles.validUntil}>
            <Text>
              This quote is valid until {formatDate(quote.validUntil)}. 
              {isNdisClient 
                ? " Prices are subject to change after this date and may be adjusted based on the current NDIS Price Guide."
                : " Prices are subject to change after this date."
              }
            </Text>
          </View>
        )}

        {/* Notes */}
        {quote.notes && (
          <View style={styles.notes}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Additional Notes:</Text>
            <Text>{quote.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {companyName} | {companyAddress} | {companyPhone} | {companyEmail}
          </Text>
          <Text style={styles.footerText}>
            {isNdisClient ? "NDIS Registered Provider | " : ""}Generated on {new Date().toLocaleDateString('en-AU')}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
