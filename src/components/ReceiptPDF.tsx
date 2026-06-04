import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { Application } from "@/lib/supabase";
import type { PaymentData } from "@/types";

const styles = StyleSheet.create({
  page: { padding: 30 },
  title: { fontSize: 18, marginBottom: 20, textAlign: "center" },
  section: { marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
});

export const ReceiptPDF: React.FC<{
  application: Application;
  paymentData: PaymentData;
  lang: string;
}> = ({ application, paymentData, lang }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Payment Receipt</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text>Application Number:</Text>
            <Text>{String(application.application_number ?? "")}</Text>
          </View>
          <View style={styles.row}>
            <Text>Service:</Text>
            <Text>{String(application.service_name ?? "")}</Text>
          </View>
          <View style={styles.row}>
            <Text>Transaction ID:</Text>
            <Text>{String(paymentData.transaction_id ?? "")}</Text>
          </View>
          <View style={styles.row}>
            <Text>Amount:</Text>
            <Text>{String(paymentData.amount ?? 0)} TZS</Text>
          </View>
          <View style={styles.row}>
            <Text>Payment Method:</Text>
            <Text>{String(paymentData.payment_method ?? "")}</Text>
          </View>
          <View style={styles.row}>
            <Text>Date:</Text>
            <Text>
              {paymentData.paid_at ? new Date(paymentData.paid_at).toLocaleDateString() : ""}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
