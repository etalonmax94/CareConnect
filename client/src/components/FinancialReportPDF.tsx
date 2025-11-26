import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #1e3a5f",
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  dateRange: {
    fontSize: 10,
    color: "#888",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 10,
    borderBottom: "1px solid #ddd",
    paddingBottom: 5,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    width: "30%",
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e3a5f",
  },
  table: {
    width: "100%",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e3a5f",
    color: "#fff",
    padding: 8,
    fontSize: 9,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #eee",
    padding: 8,
    fontSize: 9,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottom: "1px solid #eee",
    padding: 8,
    fontSize: 9,
    backgroundColor: "#f8f9fa",
  },
  col1: { width: "25%" },
  col2: { width: "20%" },
  col3: { width: "20%" },
  col4: { width: "15%" },
  col5: { width: "20%" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#888",
    borderTop: "1px solid #ddd",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badge: {
    padding: "2px 6px",
    borderRadius: 3,
    fontSize: 8,
  },
  badgeGreen: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  badgeAmber: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  badgeRed: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  totalsRow: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    padding: 8,
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 5,
  },
});

interface FinancialSummary {
  summary: {
    totalBudgetAllocated: number;
    totalBudgetUsed: number;
    totalBudgetRemaining: number;
    budgetUtilization: number;
    totalServiceRevenue: number;
    totalServiceHours: number;
    totalServicesDelivered: number;
    invoiceSummary: {
      pending: { count: number; amount: number };
      paid: { count: number; amount: number };
      overdue: { count: number; amount: number };
    };
  };
  budgetByCategory: Array<{
    category: string;
    allocated: number;
    used: number;
    remaining: number;
    utilization: number;
  }>;
  servicesByClient: Array<{
    clientId: string;
    clientName: string;
    services: number;
    revenue: number;
    hours: number;
  }>;
  reportPeriod: {
    startDate: string | null;
    endDate: string | null;
    generatedAt: string;
  };
}

interface FinancialReportPDFProps {
  data: FinancialSummary;
  reportType: "summary" | "budget" | "services" | "invoices";
  companyName?: string;
}

export function FinancialReportPDF({ data, reportType, companyName = "EmpowerLink" }: FinancialReportPDFProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "All Time";
    return format(new Date(date), "dd MMM yyyy");
  };

  const getDateRangeText = () => {
    const { startDate, endDate } = data.reportPeriod;
    if (!startDate && !endDate) return "All Time";
    if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    if (startDate) return `From ${formatDate(startDate)}`;
    return `Until ${formatDate(endDate)}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{companyName}</Text>
          <Text style={styles.subtitle}>
            {reportType === "summary" && "Financial Summary Report"}
            {reportType === "budget" && "Budget Utilization Report"}
            {reportType === "services" && "Service Delivery Report"}
            {reportType === "invoices" && "Invoice Status Report"}
          </Text>
          <Text style={styles.dateRange}>
            Period: {getDateRangeText()} | Generated: {format(new Date(data.reportPeriod.generatedAt), "dd MMM yyyy HH:mm")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Overview</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Budget Allocated</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.summary.totalBudgetAllocated)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Budget Used</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.summary.totalBudgetUsed)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Budget Remaining</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.summary.totalBudgetRemaining)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Budget Utilization</Text>
              <Text style={styles.summaryValue}>{data.summary.budgetUtilization}%</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Service Revenue</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.summary.totalServiceRevenue)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Service Hours</Text>
              <Text style={styles.summaryValue}>{data.summary.totalServiceHours} hrs</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Pending Invoices</Text>
              <Text style={styles.summaryValue}>
                {data.summary.invoiceSummary.pending.count} ({formatCurrency(data.summary.invoiceSummary.pending.amount)})
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Paid Invoices</Text>
              <Text style={styles.summaryValue}>
                {data.summary.invoiceSummary.paid.count} ({formatCurrency(data.summary.invoiceSummary.paid.amount)})
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Overdue Invoices</Text>
              <Text style={styles.summaryValue}>
                {data.summary.invoiceSummary.overdue.count} ({formatCurrency(data.summary.invoiceSummary.overdue.amount)})
              </Text>
            </View>
          </View>
        </View>

        {data.budgetByCategory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget by Category</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col1}>Category</Text>
                <Text style={styles.col2}>Allocated</Text>
                <Text style={styles.col3}>Used</Text>
                <Text style={styles.col4}>Remaining</Text>
                <Text style={styles.col5}>Utilization</Text>
              </View>
              {data.budgetByCategory.map((item, index) => (
                <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={styles.col1}>{item.category}</Text>
                  <Text style={styles.col2}>{formatCurrency(item.allocated)}</Text>
                  <Text style={styles.col3}>{formatCurrency(item.used)}</Text>
                  <Text style={styles.col4}>{formatCurrency(item.remaining)}</Text>
                  <Text style={styles.col5}>{item.utilization}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {data.servicesByClient.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services by Client (Top 10)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col1}>Client</Text>
                <Text style={styles.col2}>Services</Text>
                <Text style={styles.col3}>Revenue</Text>
                <Text style={styles.col4}>Hours</Text>
                <Text style={styles.col5}>Avg/Service</Text>
              </View>
              {data.servicesByClient.slice(0, 10).map((item, index) => (
                <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={styles.col1}>{item.clientName}</Text>
                  <Text style={styles.col2}>{item.services}</Text>
                  <Text style={styles.col3}>{formatCurrency(item.revenue)}</Text>
                  <Text style={styles.col4}>{item.hours.toFixed(1)}</Text>
                  <Text style={styles.col5}>{formatCurrency(item.services > 0 ? item.revenue / item.services : 0)}</Text>
                </View>
              ))}
              <View style={styles.totalsRow}>
                <Text style={styles.col1}>TOTAL</Text>
                <Text style={styles.col2}>{data.servicesByClient.reduce((sum, c) => sum + c.services, 0)}</Text>
                <Text style={styles.col3}>{formatCurrency(data.servicesByClient.reduce((sum, c) => sum + c.revenue, 0))}</Text>
                <Text style={styles.col4}>{data.servicesByClient.reduce((sum, c) => sum + c.hours, 0).toFixed(1)}</Text>
                <Text style={styles.col5}>-</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text>EmpowerLink CRM - Confidential Financial Report</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
