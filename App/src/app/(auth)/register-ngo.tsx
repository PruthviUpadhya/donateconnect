import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Colors, Spacing, Typography } from "../../theme/colors";
import { api } from "../../api/client";
import { pickDocument, uploadFile } from "../../utils/uploader";
import { ImageViewerModal } from "../../components/ImageViewerModal";

export default function RegisterNgoScreen() {
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ngoName, setNgoName] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Uploaded document URLs & state
  const [certUrl, setCertUrl] = useState<string>("");
  const [certName, setCertName] = useState<string>("");
  const [uploadingCert, setUploadingCert] = useState(false);

  const [panUrl, setPanUrl] = useState<string>("");
  const [panName, setPanName] = useState<string>("");
  const [uploadingPan, setUploadingPan] = useState(false);

  // In-app preview modal state (previews in same tab/app on all devices)
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickCert = async () => {
    try {
      setError(null);
      const doc = await pickDocument();
      if (!doc) return;

      setUploadingCert(true);
      const res = await uploadFile(
        doc.uri,
        doc.name,
        doc.mimeType || "application/pdf"
      );
      setCertUrl(res.url);
      setCertName(doc.name || "registration_certificate.pdf");
    } catch (err: any) {
      setError(err.message || "Failed to upload registration certificate");
    } finally {
      setUploadingCert(false);
    }
  };

  const handlePickPan = async () => {
    try {
      setError(null);
      const doc = await pickDocument();
      if (!doc) return;

      setUploadingPan(true);
      const res = await uploadFile(
        doc.uri,
        doc.name,
        doc.mimeType || "image/jpeg"
      );
      setPanUrl(res.url);
      setPanName(doc.name || "pan_card_document");
    } catch (err: any) {
      setError(err.message || "Failed to upload PAN document");
    } finally {
      setUploadingPan(false);
    }
  };

  const handleRegisterNgo = async () => {
    if (!ownerName || !email || !password || !ngoName || !officialEmail || !contactNumber || !address) {
      setError("Please fill in all mandatory representative and organization details");
      return;
    }

    if (!certUrl) {
      setError("Please upload the NGO Government Registration Certificate before submitting");
      return;
    }

    if (!panUrl) {
      setError("Please upload the Official PAN Card / Tax Document before submitting");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const trimmedWebsite = websiteUrl.trim();
      let formattedWebsite: string | undefined = undefined;
      if (trimmedWebsite) {
        formattedWebsite = trimmedWebsite.startsWith("http://") || trimmedWebsite.startsWith("https://")
          ? trimmedWebsite
          : `https://${trimmedWebsite}`;
      }

      await api.request("/auth/register-ngo", {
        method: "POST",
        body: JSON.stringify({
          ownerName: ownerName.trim(),
          email: email.trim().toLowerCase(),
          password,
          ngoName: ngoName.trim(),
          officialEmail: officialEmail.trim().toLowerCase(),
          contactNumber: contactNumber.trim(),
          address: address.trim(),
          websiteUrl: formattedWebsite,
          registrationCertificateUrl: certUrl,
          panCardUrl: panUrl,
        }),
      });

      router.push({
        pathname: "/(auth)/verify-otp",
        params: { email: email.trim().toLowerCase(), purpose: "EMAIL_VERIFICATION" },
      });
    } catch (err: any) {
      setError(err.message || "Failed to register NGO");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Register Partner NGO</Text>
          <Text style={styles.subtitle}>
            Upload official credentials to establish trust with donors & volunteers
          </Text>
        </View>

        <Card style={styles.formCard} variant="elevated">
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.sectionHeader}>1. Primary Representative</Text>
          <Input
            label="Representative Full Name *"
            placeholder="Dr. Sarah Jenkins"
            value={ownerName}
            onChangeText={setOwnerName}
          />
          <Input
            label="Account Login Email *"
            placeholder="sarah@ngo.org"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Account Password *"
            placeholder="Min 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={[styles.sectionHeader, { marginTop: Spacing.sm }]}>2. Organization Details</Text>
          <Input
            label="Official NGO Name *"
            placeholder="Hope Children Foundation"
            value={ngoName}
            onChangeText={setNgoName}
          />
          <Input
            label="Official Contact Email *"
            placeholder="contact@hopechildren.org"
            value={officialEmail}
            onChangeText={setOfficialEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Official Helpline Phone *"
            placeholder="+91 80 1234 5678"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
          />
          <Input
            label="Registered Headquarters Address *"
            placeholder="Plot 42, Relief Road, Indiranagar, Bengaluru"
            value={address}
            onChangeText={setAddress}
          />
          <Input
            label="Website URL (optional)"
            placeholder="https://hopechildren.org"
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            keyboardType="url"
            autoCapitalize="none"
          />

          <Text style={[styles.sectionHeader, { marginTop: Spacing.sm }]}>
            3. Required Verification Documents (Mandatory)
          </Text>
          <Text style={Typography.caption}>
            Upload legal non-profit papers from your device (PDF, PNG, JPG). Documents are securely stored in the database.
          </Text>

          {/* Registration Certificate Upload Box */}
          <View style={styles.uploadSection}>
            <View style={styles.labelRow}>
              <Text style={styles.uploadLabel}>Government Registration Certificate</Text>
              <Text style={styles.requiredPill}>REQUIRED</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickCert}
              disabled={uploadingCert}
              style={[styles.uploadBox, certUrl ? styles.uploadBoxDone : null]}
            >
              {uploadingCert ? (
                <View style={styles.uploadLoadingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.uploadBoxText}>Uploading document to secure storage...</Text>
                </View>
              ) : certUrl ? (
                <View style={styles.uploadedRow}>
                  <View style={styles.checkIconBadge}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadedSuccessTitle}>Successfully Stored</Text>
                    <Text style={styles.uploadedFilename} numberOfLines={1}>{certName}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setPreviewImages([certUrl]);
                        setPreviewTitle(`Registration Certificate - ${certName}`);
                        setPreviewVisible(true);
                      }}
                    >
                      <Text style={styles.previewLinkText}>View uploaded document ↗</Text>
                    </TouchableOpacity>
                  </View>
                  <Button
                    title="Change"
                    size="sm"
                    variant="outline"
                    onPress={handlePickCert}
                  />
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadBoxIcon}>📄</Text>
                  <Text style={styles.uploadBoxTitle}>Select Certificate PDF or Image</Text>
                  <Text style={styles.uploadBoxSubtitle}>Tap to browse your device files (Max 10MB)</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* PAN Card Upload Box */}
          <View style={styles.uploadSection}>
            <View style={styles.labelRow}>
              <Text style={styles.uploadLabel}>Official PAN Card / Tax Exemption</Text>
              <Text style={styles.requiredPill}>REQUIRED</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickPan}
              disabled={uploadingPan}
              style={[styles.uploadBox, panUrl ? styles.uploadBoxDone : null]}
            >
              {uploadingPan ? (
                <View style={styles.uploadLoadingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.uploadBoxText}>Uploading document to secure storage...</Text>
                </View>
              ) : panUrl ? (
                <View style={styles.uploadedRow}>
                  <View style={styles.checkIconBadge}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadedSuccessTitle}>Successfully Stored</Text>
                    <Text style={styles.uploadedFilename} numberOfLines={1}>{panName}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setPreviewImages([panUrl]);
                        setPreviewTitle(`PAN Card - ${panName}`);
                        setPreviewVisible(true);
                      }}
                    >
                      <Text style={styles.previewLinkText}>View uploaded document ↗</Text>
                    </TouchableOpacity>
                  </View>
                  <Button
                    title="Change"
                    size="sm"
                    variant="outline"
                    onPress={handlePickPan}
                  />
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadBoxIcon}>💳</Text>
                  <Text style={styles.uploadBoxTitle}>Select PAN Card Document</Text>
                  <Text style={styles.uploadBoxSubtitle}>Tap to browse photo or PDF (Max 10MB)</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Button
            title="Submit NGO for Verification"
            onPress={handleRegisterNgo}
            loading={loading}
            style={styles.submitButton}
          />
        </Card>

        <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.backLink}>
          <Text style={styles.backText}>Already have an account? Sign in</Text>
        </TouchableOpacity>

        {/* In-app Document Preview Modal (renders on same tab across Android, iOS, and Web) */}
        <ImageViewerModal
          visible={previewVisible}
          images={previewImages}
          initialIndex={0}
          onClose={() => setPreviewVisible(false)}
          title={previewTitle}
        />
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
    maxWidth: 520,
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
    fontSize: 26,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.body,
    textAlign: "center",
    lineHeight: 20,
  },
  formCard: {
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  sectionHeader: {
    ...Typography.caption,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
    color: Colors.accentIndigo,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 4,
  },
  uploadSection: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  uploadLabel: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  requiredPill: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.accentRose,
    backgroundColor: "#fff1f2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  uploadBoxDone: {
    borderStyle: "solid",
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
  },
  uploadPlaceholder: {
    alignItems: "center",
    gap: 4,
  },
  uploadBoxIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  uploadBoxTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  uploadBoxSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  uploadLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  uploadBoxText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  uploadedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  checkIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  uploadedSuccessTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
  },
  uploadedFilename: {
    fontSize: 12,
    fontWeight: "500",
    color: "#334155",
    marginTop: 2,
  },
  previewLinkText: {
    fontSize: 11,
    color: Colors.accentIndigo,
    fontWeight: "600",
    marginTop: 3,
    textDecorationLine: "underline",
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
    marginTop: Spacing.sm,
  },
  backLink: {
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  backText: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
