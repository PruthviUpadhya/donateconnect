import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusChip } from "../../components/StatusChip";
import { useAuth } from "../../context/AuthContext";
import { Colors, Spacing, Typography } from "../../theme/colors";

export default function VerificationPendingScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Card style={styles.card} variant="elevated">
          <View style={styles.statusBadgeRow}>
            <StatusChip status="PENDING" />
          </View>

          <Text style={styles.title}>Verification In Progress</Text>
          <Text style={styles.subtitle}>
            Thank you for registering with DonateConnect. Your official NGO documents and non-profit credentials have been submitted for review.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Organization Status</Text>
            <Text style={styles.infoText}>
              Platform Administrators verify all legal documentation before unlocking donation pipelines to maintain donor trust. Review usually takes 24-48 business hours.
            </Text>
          </View>

          <Button
            title="Return to Portal Hub"
            onPress={() => router.replace("/")}
            style={styles.actionButton}
          />

          <Button
            title="Sign Out"
            variant="outline"
            onPress={async () => {
              await logout();
              router.replace("/(auth)/login");
            }}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    maxWidth: 460,
    width: "100%",
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: "center",
  },
  statusBadgeRow: {
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.titleLarge,
    fontSize: 24,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.body,
    textAlign: "center",
    lineHeight: 21,
  },
  infoBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: Spacing.md,
    width: "100%",
    gap: 4,
  },
  infoLabel: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionButton: {
    width: "100%",
    marginTop: Spacing.xs,
  },
});
