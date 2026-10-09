import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Colors, Spacing, Typography, BorderRadius } from "../theme/colors";
import { api } from "../api/client";

export default function WelcomeScreen() {
  const { user, role, setDemoRole, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState<string>("Checking...");
  const [dbStatus, setDbStatus] = useState<string>("Checking...");
  const [lastChecked, setLastChecked] = useState<string>("");

  const checkStatus = () => {
    api
      .checkHealth()
      .then((res) => {
        setHealthStatus(res.status === "ok" ? "Online" : res.status);
        setDbStatus(res.database === "connected" ? "Connected" : res.database);
        setLastChecked(new Date().toLocaleTimeString());
      })
      .catch(() => {
        setHealthStatus("Offline");
        setDbStatus("Disconnected");
        setLastChecked(new Date().toLocaleTimeString());
      });
  };

  useEffect(() => {
    checkStatus();
    // Poll status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleSelect = (selectedRole: "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN") => {
    setDemoRole(selectedRole);
    if (selectedRole === "DONOR") router.push("/(donor)");
    else if (selectedRole === "NGO") router.push("/(ngo)");
    else if (selectedRole === "VOLUNTEER") router.push("/(volunteer)");
    else if (selectedRole === "ADMIN") router.push("/(admin)");
  };

  const getDashboardRoute = () => {
    if (role === "DONOR") return "/(donor)";
    if (role === "NGO") return "/(ngo)";
    if (role === "VOLUNTEER") return "/(volunteer)";
    if (role === "ADMIN") return "/(admin)";
    return "/(donor)";
  };

  const isServerOnline = healthStatus.toLowerCase().includes("ok") || healthStatus.toLowerCase().includes("online");
  const isDbConnected = dbStatus.toLowerCase().includes("connected");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Navigation Bar Header */}
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.push("/")} style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>DC</Text>
            </View>
            <Text style={styles.brandTitle}>DonateConnect</Text>
          </TouchableOpacity>

          <View style={styles.authButtons}>
            {user ? (
              <View style={styles.loggedInRow}>
                <Button
                  title="My Dashboard"
                  size="sm"
                  onPress={() => router.push(getDashboardRoute() as any)}
                />
                <Button
                  title="Sign Out"
                  variant="outline"
                  size="sm"
                  onPress={logout}
                />
              </View>
            ) : (
              <View style={styles.guestRow}>
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
              </View>
            )}
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>Direct Aid • Verified NGOs • Transparent Tracking</Text>
          </View>
          <Text style={styles.heroTitle}>Bridging Surplus with Community Need</Text>
          <Text style={styles.heroSubtitle}>
            DonateConnect connects generous donors with verified grassroots NGOs and local volunteers.
            Every donation is tracked from doorstep pickup to verified recipient delivery.
          </Text>

          {/* Call to Actions */}
          <View style={styles.ctaRow}>
            <Button
              title="Donate Goods"
              onPress={() => (user ? router.push(getDashboardRoute() as any) : router.push("/(auth)/register"))}
              style={styles.ctaButton}
            />
            <Button
              title="Register as NGO"
              variant="outline"
              onPress={() => router.push("/(auth)/register-ngo")}
              style={styles.ctaButton}
            />
            <Button
              title="Volunteer"
              variant="secondary"
              onPress={() => router.push("/(auth)/register")}
              style={styles.ctaButton}
            />
          </View>
        </View>

        {/* What We Do Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTag}>OUR MISSION</Text>
            <Text style={styles.sectionTitle}>What We Do</Text>
            <Text style={styles.sectionDescription}>
              We turn good intentions into verifiable, accountable real-world impact across communities.
            </Text>
          </View>

          <View style={styles.featuresGrid}>
            <Card style={styles.featureCard} variant="elevated">
              <View style={[styles.featureIconBox, { backgroundColor: "#eff6ff" }]}>
                <Text style={styles.featureIcon}>📦</Text>
              </View>
              <Text style={styles.featureCardTitle}>Direct Donation Matching</Text>
              <Text style={styles.featureCardDesc}>
                Donors list surplus clothes, groceries, books, and medical supplies. Verified NGOs instantly match them with immediate community needs.
              </Text>
            </Card>

            <Card style={styles.featureCard} variant="elevated">
              <View style={[styles.featureIconBox, { backgroundColor: "#f0fdf4" }]}>
                <Text style={styles.featureIcon}>🛡️</Text>
              </View>
              <Text style={styles.featureCardTitle}>Verified NGO Network</Text>
              <Text style={styles.featureCardDesc}>
                Every NGO undergoes strict document, PAN, and certificate verification before claiming donations, ensuring 100% legitimate aid.
              </Text>
            </Card>

            <Card style={styles.featureCard} variant="elevated">
              <View style={[styles.featureIconBox, { backgroundColor: "#fef3c7" }]}>
                <Text style={styles.featureIcon}>🚚</Text>
              </View>
              <Text style={styles.featureCardTitle}>Doorstep Volunteer Logistics</Text>
              <Text style={styles.featureCardDesc}>
                Dedicated local volunteers coordinate convenient doorstep pickups and deliver directly to NGO hubs with zero hassle for donors.
              </Text>
            </Card>

            <Card style={styles.featureCard} variant="elevated">
              <View style={[styles.featureIconBox, { backgroundColor: "#faf5ff" }]}>
                <Text style={styles.featureIcon}>📸</Text>
              </View>
              <Text style={styles.featureCardTitle}>Photo Proof & Transparency</Text>
              <Text style={styles.featureCardDesc}>
                Live photos and OTP validation verify every delivery milestone, providing complete visibility and audit records.
              </Text>
            </Card>
          </View>
        </View>

        {/* How It Works Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTag}>STEP-BY-STEP</Text>
            <Text style={styles.sectionTitle}>How It Works</Text>
          </View>

          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Donor Lists Items</Text>
                <Text style={styles.stepDesc}>
                  Describe what you want to donate, attach photos, and specify your location for pickup.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>NGO Claims & Assigns</Text>
                <Text style={styles.stepDesc}>
                  A verified NGO reviews and claims the donation, then dispatches a nearby volunteer.
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Verified Handover & Delivery</Text>
                <Text style={styles.stepDesc}>
                  The volunteer collects the items, delivers them to the NGO, and uploads proof with OTP verification.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTag}>WHAT CAN YOU DONATE</Text>
            <Text style={styles.sectionTitle}>Essential Categories</Text>
          </View>
          <View style={styles.categoryPillsRow}>
            {["🍲 Cooked & Dry Food", "👕 Clothing & Blankets", "📚 Books & Stationery", "💊 Medical & Hygiene", "⚡ Electronics & Gadgets"].map((cat) => (
              <View key={cat} style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{cat}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Explore Role Portals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTag}>PORTALS</Text>
            <Text style={styles.sectionTitle}>Explore by Role</Text>
            <Text style={styles.sectionDescription}>
              Quickly preview or access dedicated portals tailored for each community participant:
            </Text>
          </View>

          <View style={styles.portalGrid}>
            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => handleRoleSelect("DONOR")}
            >
              <Text style={styles.portalTitle}>Donor Portal →</Text>
              <Text style={styles.portalDesc}>List items for donation, schedule pickups, track progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => handleRoleSelect("NGO")}
            >
              <Text style={styles.portalTitle}>NGO Portal →</Text>
              <Text style={styles.portalDesc}>Accept donations, assign volunteers, fulfill community needs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => handleRoleSelect("VOLUNTEER")}
            >
              <Text style={styles.portalTitle}>Volunteer Portal →</Text>
              <Text style={styles.portalDesc}>Accept pickup tasks, deliver to NGOs, upload proof photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.portalCard}
              onPress={() => handleRoleSelect("ADMIN")}
            >
              <Text style={styles.portalTitle}>Admin Portal →</Text>
              <Text style={styles.portalDesc}>Verify NGO registration documents, view logs and platform analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FOOTER: Server & Database Status ONLY */}
        <View style={styles.footerContainer}>
          <View style={styles.footerDivider} />

          <View style={styles.footerStatusCard}>
            <View style={styles.statusGroup}>
              {/* Server Status */}
              <View style={styles.statusItem}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isServerOnline ? "#22c55e" : "#ef4444" },
                  ]}
                />
                <Text style={styles.statusTitle}>Server:</Text>
                <Text
                  style={[
                    styles.statusState,
                    { color: isServerOnline ? "#15803d" : "#b91c1c" },
                  ]}
                >
                  {healthStatus}
                </Text>
              </View>

              <Text style={styles.statusSeparator}>•</Text>

              {/* Database Status */}
              <View style={styles.statusItem}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isDbConnected ? "#22c55e" : "#ef4444" },
                  ]}
                />
                <Text style={styles.statusTitle}>Database:</Text>
                <Text
                  style={[
                    styles.statusState,
                    { color: isDbConnected ? "#15803d" : "#b91c1c" },
                  ]}
                >
                  {dbStatus}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={checkStatus} style={styles.refreshButton}>
              <Text style={styles.refreshText}>Check Status ↻</Text>
            </TouchableOpacity>
          </View>

          {lastChecked ? (
            <Text style={styles.lastCheckedText}>Status last verified at {lastChecked}</Text>
          ) : null}

          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} DonateConnect • Transparent Community Donation Platform
          </Text>
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
    gap: Spacing.xl,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  brandTitle: {
    ...Typography.titleLarge,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  authButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  loggedInRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  guestRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  heroSection: {
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  badgePill: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.accentBlue,
  },
  heroTitle: {
    ...Typography.titleLarge,
    fontSize: 32,
    textAlign: "center",
    lineHeight: 38,
  },
  heroSubtitle: {
    ...Typography.body,
    textAlign: "center",
    maxWidth: 580,
    fontSize: 15,
    lineHeight: 23,
  },
  ctaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ctaButton: {
    minWidth: 120,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTag: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.accentIndigo,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    ...Typography.titleLarge,
    fontSize: 22,
  },
  sectionDescription: {
    ...Typography.body,
    fontSize: 14,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  featureCard: {
    flex: 1,
    minWidth: 280,
    padding: Spacing.md,
    gap: 8,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  featureCardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  stepsContainer: {
    gap: Spacing.sm,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  stepNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  categoryPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryPill: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  portalGrid: {
    gap: Spacing.sm,
  },
  portalCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 4,
  },
  portalTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  portalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footerContainer: {
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    alignItems: "center",
  },
  footerDivider: {
    width: "100%",
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginBottom: Spacing.sm,
  },
  footerStatusCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    gap: Spacing.md,
  },
  statusGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  statusState: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusSeparator: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  refreshButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.accentBlue,
  },
  lastCheckedText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  copyrightText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
