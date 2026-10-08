import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { useAuth } from "../../context/AuthContext";
import { Colors, Spacing, Typography } from "../../theme/colors";
import { api } from "../../api/client";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in both email and password");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.request<{
        success: boolean;
        data: {
          user: any;
          tokens: { accessToken: string; refreshToken: string };
        };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      await login(res.data.tokens.accessToken, res.data.user, res.data.tokens.refreshToken);

      // Route based on role
      const role = res.data.user.role;
      if (role === "DONOR") router.replace("/(donor)");
      else if (role === "NGO") {
        if (res.data.user.ownedNgo?.verificationStatus === "PENDING") {
          router.replace("/(auth)/verification-pending");
        } else {
          router.replace("/(ngo)");
        }
      } else if (role === "VOLUNTEER") router.replace("/(volunteer)");
      else if (role === "ADMIN") router.replace("/(admin)");
      else router.replace("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Enter your credentials to access your account</Text>
        </View>

        <Card style={styles.formCard} variant="elevated">
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

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
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.submitButton}
          />
        </Card>

        <View style={styles.footerRow}>
          <Text style={Typography.body}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={styles.linkText}>Register here</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.ngoRegisterLink} onPress={() => router.push("/(auth)/register-ngo")}>
          <Text style={styles.ngoLinkText}>Register as an NGO Partner →</Text>
        </TouchableOpacity>
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
    paddingTop: Spacing.xl,
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
  ngoRegisterLink: {
    alignSelf: "center",
  },
  ngoLinkText: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.accentIndigo,
  },
});
