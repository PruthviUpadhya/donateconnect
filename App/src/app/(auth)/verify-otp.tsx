import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { useAuth } from "../../context/AuthContext";
import { Colors, Spacing, Typography } from "../../theme/colors";
import { api } from "../../api/client";

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{ email?: string; purpose?: string }>();
  const { login } = useAuth();

  const [email, setEmail] = useState(params.email || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!email || code.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code");
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
      }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email,
          code: code.trim(),
          purpose: params.purpose || "EMAIL_VERIFICATION",
        }),
      });

      await login(res.data.tokens.accessToken, res.data.user, res.data.tokens.refreshToken);

      // Route directly according to role
      const role = res.data.user.role;
      if (role === "DONOR") router.replace("/(donor)");
      else if (role === "NGO") router.replace("/(auth)/verification-pending");
      else if (role === "VOLUNTEER") router.replace("/(volunteer)");
      else if (role === "ADMIN") router.replace("/(admin)");
      else router.replace("/");
    } catch (err: any) {
      setError(err.message || "Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Email address is required to resend verification code");
      return;
    }

    try {
      setResending(true);
      setError(null);

      await api.request("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({
          email,
          purpose: params.purpose || "EMAIL_VERIFICATION",
        }),
      });

      setSuccessMsg("A fresh 6-digit code has been dispatched to your email");
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to{"\n"}
            <Text style={styles.emailHighlight}>{email || "your email address"}</Text>
          </Text>
        </View>

        <Card style={styles.formCard} variant="elevated">
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {successMsg && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          {!params.email && (
            <Input
              label="Email address"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}

          <Input
            label="6-Digit Verification Code"
            placeholder="123456"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.otpInput}
          />

          <Button
            title="Verify & Continue"
            onPress={handleVerify}
            loading={loading}
            style={styles.submitButton}
          />

          <Button
            title="Resend Code"
            variant="outline"
            onPress={handleResend}
            loading={resending}
          />
        </Card>

        <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.backLink}>
          <Text style={styles.backText}>← Back to Sign In</Text>
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
    lineHeight: 22,
  },
  emailHighlight: {
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  formCard: {
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "700",
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
  successBox: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: Spacing.sm + 2,
    borderRadius: 8,
  },
  successText: {
    color: Colors.accentEmerald,
    fontSize: 13,
    fontWeight: "500",
  },
  submitButton: {
    marginTop: Spacing.xs,
  },
  backLink: {
    alignSelf: "center",
  },
  backText: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
