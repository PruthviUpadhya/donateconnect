import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Colors, Spacing, Typography } from "../../theme/colors";
import { api } from "../../api/client";

export default function RegisterScreen() {
  const [role, setRole] = useState<"DONOR" | "VOLUNTEER">("DONOR");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Please complete all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.request("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone: phone || undefined,
          address: address || undefined,
        }),
      });

      // Redirect to OTP verification screen with email prefilled
      router.push({
        pathname: "/(auth)/verify-otp",
        params: { email, purpose: "EMAIL_VERIFICATION" },
      });
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create an account</Text>
          <Text style={styles.subtitle}>Join DonateConnect and help your local community</Text>
        </View>

        {/* Role Segmented Switcher */}
        <View style={styles.roleTabs}>
          <TouchableOpacity
            style={[styles.roleTab, role === "DONOR" && styles.activeTab]}
            onPress={() => setRole("DONOR")}
          >
            <Text style={[styles.roleTabText, role === "DONOR" && styles.activeTabText]}>
              I want to Donate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleTab, role === "VOLUNTEER" && styles.activeTab]}
            onPress={() => setRole("VOLUNTEER")}
          >
            <Text style={[styles.roleTabText, role === "VOLUNTEER" && styles.activeTabText]}>
              I am a Volunteer
            </Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.formCard} variant="elevated">
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label="Full name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Email address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="Min 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Input
            label="Phone number (optional)"
            placeholder="+91 9876543210"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Input
            label="Location / Area (optional)"
            placeholder="Koramangala, Bengaluru"
            value={address}
            onChangeText={setAddress}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footerRow}>
          <Text style={Typography.body}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.linkText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
    gap: Spacing.lg,
    paddingTop: Spacing.md,
  },
  header: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  title: {
    ...Typography.titleLarge,
    fontSize: 28,
  },
  subtitle: {
    ...Typography.body,
    textAlign: "center",
  },
  roleTabs: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 3,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  formCard: {
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  errorBox: {
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: Spacing.sm + 2,
    borderRadius: 8,
  },
  errorText: {
    color: Colors.accentRose,
    fontSize: 13,
    fontWeight: "500",
  },
  submitButton: {
    marginTop: Spacing.xs,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  linkText: {
    ...Typography.body,
    fontWeight: "600",
    color: Colors.primary,
    textDecorationLine: "underline",
  },
});
