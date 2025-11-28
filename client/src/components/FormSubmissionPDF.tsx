import { Document, Page, Text, View, StyleSheet, Image, Font, pdf } from "@react-pdf/renderer";
import type { FormTemplate, FormTemplateField, FormSubmission, FormSubmissionValue, FormSignature, Client } from "@shared/schema";

Font.register({
  family: "Open Sans",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf", fontWeight: 400 },
    { src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf", fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
    fontFamily: "Open Sans",
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #1e3a5f",
    paddingBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1e3a5f",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 3,
  },
  clientInfo: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 5,
  },
  clientDetails: {
    fontSize: 9,
    color: "#555555",
  },
  section: {
    marginBottom: 15,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1e3a5f",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: "1px solid #e0e0e0",
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  fieldLabel: {
    width: "35%",
    fontSize: 9,
    fontWeight: 700,
    color: "#333333",
  },
  fieldValue: {
    width: "65%",
    fontSize: 9,
    color: "#444444",
  },
  paragraph: {
    fontSize: 9,
    color: "#444444",
    marginBottom: 10,
    lineHeight: 1.4,
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderRadius: 4,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  checkboxBox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: "#333333",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#1e3a5f",
  },
  checkboxLabel: {
    fontSize: 9,
    color: "#333333",
    flex: 1,
  },
  signatureBlock: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    marginBottom: 15,
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 10,
    color: "#1e3a5f",
  },
  signatureImage: {
    maxWidth: 200,
    maxHeight: 80,
    marginBottom: 5,
  },
  signatureInfo: {
    fontSize: 8,
    color: "#666666",
    marginTop: 5,
  },
  signatureLine: {
    borderBottom: "1px solid #333333",
    marginTop: 40,
    marginBottom: 5,
    width: 200,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1px solid #e0e0e0",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#888888",
  },
  pageNumber: {
    fontSize: 8,
    color: "#888888",
  },
  ratingStars: {
    flexDirection: "row",
    marginTop: 2,
  },
  star: {
    fontSize: 12,
    marginRight: 2,
  },
  yesNoBox: {
    flexDirection: "row",
    gap: 10,
  },
  yesNoOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  yesNoIndicator: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  yesNoSelected: {
    backgroundColor: "#1e3a5f",
  },
  emptyValue: {
    color: "#999999",
    fontStyle: "italic",
  },
});

interface FormSubmissionPDFProps {
  template: FormTemplate;
  fields: FormTemplateField[];
  submission: FormSubmission;
  values: FormSubmissionValue[];
  signatures: FormSignature[];
  client: Client;
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(date);
  }
};

const getFieldValue = (fieldId: string, values: FormSubmissionValue[]): unknown => {
  const value = values.find(v => v.fieldId === fieldId);
  return value?.value;
};

export function FormSubmissionPDFDocument({
  template,
  fields,
  submission,
  values,
  signatures,
  client,
}: FormSubmissionPDFProps) {
  const sortedFields = [...fields].sort((a, b) => 
    parseInt(a.order || "0") - parseInt(b.order || "0")
  );

  const isFieldVisible = (field: FormTemplateField): boolean => {
    if (!field.conditionalOn) return true;
    const conditionField = fields.find(f => f.fieldKey === field.conditionalOn);
    if (!conditionField) return true;
    
    const conditionValue = getFieldValue(conditionField.id, values);
    const targetValue = field.conditionalValue;
    const operator = field.conditionalOperator || "equals";

    switch (operator) {
      case "equals":
        return conditionValue === targetValue || String(conditionValue) === targetValue;
      case "not_equals":
        return conditionValue !== targetValue && String(conditionValue) !== targetValue;
      case "contains":
        return String(conditionValue || "").includes(targetValue || "");
      case "greater_than":
        return Number(conditionValue) > Number(targetValue);
      case "less_than":
        return Number(conditionValue) < Number(targetValue);
      default:
        return true;
    }
  };

  const renderFieldValue = (field: FormTemplateField) => {
    const value = getFieldValue(field.id, values);
    
    if (value === null || value === undefined || value === "") {
      return <Text style={styles.emptyValue}>Not provided</Text>;
    }

    switch (field.fieldType) {
      case "yes_no":
        return (
          <View style={styles.yesNoBox}>
            <View style={styles.yesNoOption}>
              <View style={value === "yes" ? [styles.yesNoIndicator, styles.yesNoSelected] : styles.yesNoIndicator}>
                {value === "yes" && <Text style={{ color: "#fff", fontSize: 8 }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 9 }}>{field.yesLabel || "Yes"}</Text>
            </View>
            <View style={styles.yesNoOption}>
              <View style={value === "no" ? [styles.yesNoIndicator, styles.yesNoSelected] : styles.yesNoIndicator}>
                {value === "no" && <Text style={{ color: "#fff", fontSize: 8 }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 9 }}>{field.noLabel || "No"}</Text>
            </View>
          </View>
        );

      case "checkbox":
        return (
          <View style={styles.checkbox}>
            <View style={value ? [styles.checkboxBox, styles.checkboxChecked] : styles.checkboxBox}>
              {value && <Text style={{ color: "#fff", fontSize: 8 }}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>{value ? "Checked" : "Unchecked"}</Text>
          </View>
        );

      case "radio":
      case "select":
        const option = field.options?.find(o => o.value === value);
        return <Text style={styles.fieldValue}>{option?.label || String(value)}</Text>;

      case "multiselect":
        if (Array.isArray(value)) {
          const labels = value.map(v => {
            const opt = field.options?.find(o => o.value === v);
            return opt?.label || v;
          });
          return <Text style={styles.fieldValue}>{labels.join(", ")}</Text>;
        }
        return <Text style={styles.fieldValue}>{String(value)}</Text>;

      case "date":
        return <Text style={styles.fieldValue}>{formatDate(String(value))}</Text>;

      case "rating":
        const rating = typeof value === "number" ? value : parseInt(String(value)) || 0;
        const maxRating = parseInt(field.ratingMax || "5");
        return (
          <View style={styles.ratingStars}>
            {Array.from({ length: maxRating }, (_, i) => (
              <Text key={i} style={styles.star}>
                {i < rating ? "★" : "☆"}
              </Text>
            ))}
            <Text style={{ fontSize: 9, marginLeft: 5 }}>({rating}/{maxRating})</Text>
          </View>
        );

      case "slider":
        const sliderValue = typeof value === "number" ? value : parseFloat(String(value)) || 0;
        return (
          <Text style={styles.fieldValue}>
            {sliderValue}{field.sliderUnit || ""} 
            (Range: {field.sliderMin || "0"} - {field.sliderMax || "100"})
          </Text>
        );

      case "signature":
        return null;

      case "textarea":
        return (
          <Text style={[styles.fieldValue, { lineHeight: 1.4 }]}>
            {String(value)}
          </Text>
        );

      default:
        return <Text style={styles.fieldValue}>{String(value)}</Text>;
    }
  };

  const renderField = (field: FormTemplateField) => {
    if (!isFieldVisible(field)) return null;

    if (field.fieldType === "section_header") {
      return (
        <View key={field.id} style={styles.section}>
          <Text style={styles.sectionHeader}>{field.label}</Text>
        </View>
      );
    }

    if (field.fieldType === "paragraph") {
      return (
        <View key={field.id}>
          <Text style={styles.paragraph}>{field.label}</Text>
        </View>
      );
    }

    if (field.fieldType === "signature") {
      const sigData = signatures.find(s => s.signerRole === field.fieldKey);
      return (
        <View key={field.id} style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>{field.label}</Text>
          {sigData?.signatureData ? (
            <>
              <Image src={sigData.signatureData} style={styles.signatureImage} />
              <Text style={styles.signatureInfo}>
                Signed by: {sigData.signerName}
                {sigData.signerRole && ` (${sigData.signerRole})`}
              </Text>
              <Text style={styles.signatureInfo}>
                Date: {formatDateTime(sigData.signedAt)}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureInfo}>Signature not provided</Text>
            </>
          )}
        </View>
      );
    }

    return (
      <View key={field.id} style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{field.label}:</Text>
        <View style={styles.fieldValue}>{renderFieldValue(field)}</View>
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{template.name}</Text>
          {template.description && (
            <Text style={styles.subtitle}>{template.description}</Text>
          )}
          <Text style={styles.subtitle}>Version {template.version}</Text>
        </View>

        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{client.participantName}</Text>
          <Text style={styles.clientDetails}>
            Client ID: {client.clientNumber} | Category: {client.category}
          </Text>
          {client.dateOfBirth && (
            <Text style={styles.clientDetails}>
              Date of Birth: {formatDate(client.dateOfBirth)}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Submission Details</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Status:</Text>
            <Text style={styles.fieldValue}>
              {submission.status === "submitted" ? "Completed" : submission.status}
            </Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Submitted:</Text>
            <Text style={styles.fieldValue}>
              {submission.submittedAt ? formatDateTime(submission.submittedAt) : "-"}
            </Text>
          </View>
          {submission.submittedByName && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Submitted By:</Text>
              <Text style={styles.fieldValue}>{submission.submittedByName}</Text>
            </View>
          )}
          {submission.expiryDate && (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Expiry Date:</Text>
              <Text style={styles.fieldValue}>{formatDate(submission.expiryDate)}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Form Data</Text>
          {sortedFields.map(field => renderField(field))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated: {formatDateTime(new Date())} | EmpowerLink CRM
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateFormSubmissionPDF(props: FormSubmissionPDFProps): Promise<Blob> {
  const blob = await pdf(<FormSubmissionPDFDocument {...props} />).toBlob();
  return blob;
}

export function downloadFormSubmissionPDF(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
