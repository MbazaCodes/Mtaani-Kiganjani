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
            <Text>{application.application_number}</Text>
          </View>
          <View style={styles.row}>
            <Text>Transaction ID:</Text>
            <Text>{paymentData.transaction_id}</Text>
          </View>
          <View style={styles.row}>
            <Text>Amount:</Text>
            <Text>{paymentData.amount} TZS</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
