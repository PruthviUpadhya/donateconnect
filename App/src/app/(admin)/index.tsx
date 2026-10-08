import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Colors, Spacing, Typography } from "../../theme/colors";

export default function AdminDashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={Typography.titleLarge}>Platform Administration</Text>
      <Text style={Typography.body}>
        Verify registered NGOs, monitor global donation streams, and review audit logs.
      </Text>

      <Card style={styles.card} variant="accent">
        <Text style={Typography.titleSmall}>NGO Verification Queue</Text>
        <Text style={[Typography.body, { marginVertical: Spacing.xs }]}>
          Review pending NGOs, PAN documentation, and official certificates.
        </Text>
        <Button title="Review NGO Registrations" onPress={() => {}} />
      </Card>

      <Button title="← Return to Portal Hub" variant="outline" onPress={() => router.replace("/")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
  },
});
