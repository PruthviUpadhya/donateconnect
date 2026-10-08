import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { StatCard } from "../components/StatCard";
import { StatusChip } from "../components/StatusChip";
import { Colors, Spacing, Typography } from "../theme/colors";
import { api } from "../api/client";

export default function WelcomeScreen() {
  const { user, role, setDemoRole, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState<string>("Checking...");
  const [dbStatus, setDbStatus] = useState<string>("Checking...");

  useEffect(() => {
    api
      .checkHealth()
      .then((res) => {
        setHealthStatus(res.status);
        setDbStatus(res.database);
      })
      .catch(() => {
        setHealthStatus("Offline");
        setDbStatus("Disconnected");
      });
  }, []);

  const handleRoleSelect = (selectedRole: "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN") => {
    setDemoRole(selectedRole);
    if (selectedRole === "DONOR") router.push("/(donor)");
    else if (selectedRole === "NGO") router.push("/(ngo)");
    else if (selectedRole === "VOLUNTEER") router.push("/(volunteer)");
    else if (selectedRole === "ADMIN") router.push("/(admin)");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Navigation Bar Header */}
        <View style={styles.topNav}>
          <Text style={styles.brandTitle}>DonateConnect</Text>
          <View style={styles.authButtons}>
            {user ? (
              <Button
                title="Sign Out"
                variant="outline"
                size="sm"
                onPress={logout}
              />
            ) : (
              <>
                <Button
                  title="Sign In"
                  variant="outline"
                  size="sm"
                  onPress={() => router.push("/(auth)/login")}
                />
                <Button
                  title="Register"
                  size="sm"
                  onPress={() => router.push("/(auth)/register")}
                />
              </>
            )}
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>Real Gmail SMTP OTP & Neon PostgreSQL</Text>
          </View>
          <Text style={styles.heroTitle}>Connecting Donors with Verified NGOs</Text>
          <Text style={styles.heroSubtitle}>
            A mobile-first donation management platform. Donate unused goods, mobilize volunteers, and track delivered impact in real-time.
          </Text>
        </View>

        {/* Live Backend Connection Card */}
        <Card style={styles.statusCard} variant="elevated">
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>API STATUS</Text>
              <Text style={styles.statusValue}>{healthStatus.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.statusLabel}>NEON DATABASE</Text>
              <Text
                style={[
                  styles.statusValue,
                  dbStatus === "connected" && { color: Colors.accentEmerald },
                ]}
              >
                {dbStatus.toUpperCase()}
              </Text>
            </View>
            <StatusChip status={dbStatus === "connected" ? "APPROVED" : "PENDING"} />
          </View>
        </Card>

        {/* Role Portal Cards */}
        <View style={styles.section}>
          <Text style={Typography.titleMedium}>Explore Role Portals</Text>
          <Text style={Typography.body}>
            Switch roles to experience role-isolated permissions and dashboards:
          </Text>

          <View style={styles.portalGrid}>
            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => handleRoleSelect("DONOR")}
            >
              <Text style={styles.portalTitle}>Donor Portal</Text>
              <Text style={styles.portalDesc}>List items for donation, schedule pickups, track progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => handleRoleSelect("NGO")}
            >
              <Text style={styles.portalTitle}>NGO Portal</Text>
              <Text style={styles.portalDesc}>Accept donations, assign volunteers, fulfill community needs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => handleRoleSelect("VOLUNTEER")}
            >
              <Text style={styles.portalTitle}>Volunteer Portal</Text>
              <Text style={styles.portalDesc}>Accept pickup tasks, deliver to NGOs, upload proof photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => handleRoleSelect("ADMIN")}
            >
              <Text style={styles.portalTitle}>Admin Portal</Text>
              <Text style={styles.portalDesc}>Verify NGO registration documents, view logs and platform analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Metrics */}
        <View style={styles.section}>
          <Text style={Typography.titleMedium}>Platform Foundations</Text>
          <View style={styles.statsRow}>
            <StatCard title="Categories" value="7" subtitle="Seeded in Neon" />
            <StatCard title="Email Service" value="SMTP" subtitle="Verified Active" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    padding: Spacing.md,
    gap: Spacing.lg,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  brandTitle: {
    ...Typography.titleLarge,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  authButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  heroSection: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  badgePill: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.accentBlue,
  },
  heroTitle: {
    ...Typography.titleLarge,
    fontSize: 30,
    textAlign: "center",
  },
  heroSubtitle: {
    ...Typography.body,
    textAlign: "center",
    maxWidth: 500,
  },
  statusCard: {
    padding: Spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    ...Typography.caption,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 2,
  },
  section: {
    gap: Spacing.sm,
  },
  portalGrid: {
    gap: Spacing.sm,
  },
  portalCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    padding: Spacing.md,
    gap: 4,
  },
  portalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  portalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
});
