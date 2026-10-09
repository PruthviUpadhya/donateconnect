import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusChip } from "../../components/StatusChip";
import { StatCard } from "../../components/StatCard";
import { ImageViewerModal } from "../../components/ImageViewerModal";
import { ChatModal } from "../../components/ChatModal";
import { RatingModal } from "../../components/RatingModal";
import { Colors, Spacing, Typography, BorderRadius } from "../../theme/colors";
import { api } from "../../api/client";

export default function DonorDashboardScreen() {
  const [donations, setDonations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalItems: 0,
    ngosSupported: 0,
    deliveredCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Phase 6: Chat & Rating state
  const [activeChatDonation, setActiveChatDonation] = useState<any | null>(null);
  const [activeRatingDonation, setActiveRatingDonation] = useState<any | null>(null);
  const [ratingTargetRole, setRatingTargetRole] = useState<"NGO" | "VOLUNTEER">("NGO");

  // Complaints / grievance modal
  const [complaintModalVisible, setComplaintModalVisible] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState("");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // Phase 7: Lifetime Impact Summary
  const [lifetimeImpact, setLifetimeImpact] = useState<any | null>(null);

  const fetchDashboard = async () => {
    try {
      const [dashRes, impactRes] = await Promise.all([
        api.request<{
          success: boolean;
          data: {
            stats: {
              totalDonations: number;
              totalItems: number;
              ngosSupported: number;
              deliveredCount: number;
            };
            donations: any[];
          };
        }>("/donor/dashboard"),
        api.request<{
          success: boolean;
          data: any;
        }>("/impact/donor-summary").catch(() => ({ data: null })),
      ]);

      setDonations(dashRes.data?.donations || []);
      if (dashRes.data?.stats) {
        setStats(dashRes.data.stats);
      }
      if (impactRes?.data) {
        setLifetimeImpact(impactRes.data);
      }
    } catch {
      // Fallback
      const fallback = await api.request<{ success: boolean; data: { donations: any[] } }>("/donations/mine").catch(() => ({ data: { donations: [] } }));
      setDonations(fallback.data?.donations || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleSubmitComplaint = async () => {
    if (!complaintSubject.trim() || !complaintDesc.trim()) {
      Alert.alert("Missing Fields", "Please enter both a subject and details for your grievance.");
      return;
    }
    try {
      setSubmittingComplaint(true);
      await api.request("/complaints", {
        method: "POST",
        body: JSON.stringify({
          subject: complaintSubject.trim(),
          description: complaintDesc.trim(),
        }),
      });
      setComplaintModalVisible(false);
      setComplaintSubject("");
      setComplaintDesc("");
      Alert.alert("Submitted", "Your grievance has been submitted for platform administrative review.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit grievance");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Bar */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.title}>Donor Dashboard</Text>
            <Text style={styles.subtitle}>Track your community contributions & deliveries</Text>
          </View>
          <Button
            title="+ Donate"
            size="sm"
            onPress={() => router.push("/(donor)/create-donation")}
          />
        </View>

        {/* Impact Statistics Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCol}>
            <StatCard
              title="Donations"
              value={stats.totalDonations}
              icon="🎁"
            />
          </View>
          <View style={styles.statCol}>
            <StatCard
              title="Items Given"
              value={stats.totalItems}
              icon="📦"
            />
          </View>
          <View style={styles.statCol}>
            <StatCard
              title="NGOs Helped"
              value={stats.ngosSupported}
              icon="🤝"
            />
          </View>
          <View style={styles.statCol}>
            <StatCard
              title="Delivered"
              value={stats.deliveredCount}
              icon="✓"
            />
          </View>
        </View>

        {/* Phase 7: Lifetime Estimated Environmental & Community Impact */}
        {lifetimeImpact && lifetimeImpact.totalDonations > 0 && (
          <Card style={styles.lifetimeImpactCard} variant="elevated">
            <View style={styles.lifetimeImpactHeader}>
              <View>
                <Text style={styles.lifetimeImpactTitle}>🌱 Your Lifetime Community Impact</Text>
                <Text style={styles.lifetimeImpactSub}>
                  Estimated humanitarian relief created through your generous contributions
                </Text>
              </View>
              <View style={styles.estimateBadge}>
                <Text style={styles.estimateBadgeText}>ESTIMATE</Text>
              </View>
            </View>

            <View style={styles.lifetimeMetricsGrid}>
              <View style={styles.lifetimeMetricItem}>
                <Text style={styles.lifetimeMetricNumber}>~{lifetimeImpact.totalPeopleHelped}</Text>
                <Text style={styles.lifetimeMetricText}>People Assisted</Text>
              </View>
              <View style={styles.lifetimeDivider} />
              <View style={styles.lifetimeMetricItem}>
                <Text style={styles.lifetimeMetricNumber}>{lifetimeImpact.totalCo2DivertedKg} kg</Text>
                <Text style={styles.lifetimeMetricText}>CO₂ Diverted from Landfills</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Quick Actions Card */}
        <Card style={styles.actionCard} variant="elevated">
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Have unused goods?</Text>
            <Text style={styles.actionDesc}>
              Pass on clothes, food, books, or electronics to verified community shelters and relief foundations.
            </Text>
            <Button
              title="Create New Donation →"
              onPress={() => router.push("/(donor)/create-donation")}
              style={{ marginTop: Spacing.xs }}
            />
          </View>
        </Card>

        {/* Donation History with Status & Timeline */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Donations ({donations.length})</Text>
        </View>

        {loading ? (
          <Text style={Typography.body}>Loading your contributions...</Text>
        ) : donations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Donations Made Yet</Text>
            <Text style={styles.emptyDesc}>
              Your donation requests will appear here with live tracking, volunteer status, and official receipts.
            </Text>
            <Button
              title="Start Donating"
              variant="outline"
              size="sm"
              onPress={() => router.push("/(donor)/create-donation")}
            />
          </Card>
        ) : (
          <View style={styles.list}>
            {donations.map((d) => (
              <Card key={d.id} style={styles.card} variant="elevated">
                <View style={styles.cardHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{d.category?.name || "Goods"}</Text>
                  </View>
                  <StatusChip status={d.status} />
                </View>

                <Text style={styles.quantityText}>
                  {d.quantity} {d.unit}
                </Text>
                {d.description && <Text style={styles.descriptionText}>{d.description}</Text>}

                {d.images && d.images.length > 0 && (
                  <View style={styles.imageRow}>
                    {d.images.map((img: any, idx: number) => (
                      <TouchableOpacity
                        key={img.id || idx}
                        activeOpacity={0.8}
                        onPress={() => {
                          setViewerImages(d.images.map((i: any) => i.url));
                          setViewerIndex(idx);
                          setViewerVisible(true);
                        }}
                      >
                        <Image source={{ uri: img.url }} style={styles.thumbImage} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.footerInfo}>
                  <Text style={styles.locationText}>📍 {d.pickupAddress}</Text>
                  {d.acceptedByNgo && (
                    <Text style={styles.ngoAcceptedText}>
                      Recipient NGO: <Text style={{ fontWeight: "700" }}>{d.acceptedByNgo.name}</Text>
                    </Text>
                  )}
                  {d.receipt && (
                    <View style={styles.receiptBadge}>
                      <Text style={styles.receiptText}>
                        📄 Receipt #{d.receipt.receiptNumber} Generated
                      </Text>
                    </View>
                  )}

                  {/* Collaboration Action Buttons: Chat & Rating */}
                  <View style={styles.collabButtonsRow}>
                    <TouchableOpacity
                      style={styles.chatActionBtn}
                      activeOpacity={0.8}
                      onPress={() => setActiveChatDonation(d)}
                    >
                      <Text style={styles.chatActionBtnText}>💬 Chat</Text>
                    </TouchableOpacity>

                    {d.status === "DELIVERED" && d.acceptedByNgo && (
                      <TouchableOpacity
                        style={styles.rateActionBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setRatingTargetRole("NGO");
                          setActiveRatingDonation(d);
                        }}
                      >
                        <Text style={styles.rateActionBtnText}>★ Rate NGO</Text>
                      </TouchableOpacity>
                    )}

                    {d.status === "DELIVERED" && d.assignment?.volunteer && (
                      <TouchableOpacity
                        style={styles.rateActionBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setRatingTargetRole("VOLUNTEER");
                          setActiveRatingDonation(d);
                        }}
                      >
                        <Text style={styles.rateActionBtnText}>★ Rate Courier</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Complaints / Grievance Card */}
        <Card style={styles.complaintActionCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <Text style={styles.complaintActionTitle}>Need Help or Have a Concern?</Text>
              <Text style={styles.complaintActionDesc}>
                Report issues regarding pickups, misaligned quantities, or partner conduct.
              </Text>
            </View>
            <Button
              title="File Grievance"
              variant="outline"
              size="sm"
              onPress={() => setComplaintModalVisible(true)}
            />
          </View>
        </Card>

        <TouchableOpacity onPress={() => router.replace("/")} style={styles.returnLink}>
          <Text style={styles.returnText}>← Back to Main Hub</Text>
        </TouchableOpacity>

        {/* Grievance Modal */}
        <Modal visible={complaintModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={Typography.titleSmall}>File Grievance / Concern</Text>
              <Text style={[Typography.body, { fontSize: 13, color: Colors.textSecondary }]}>
                Our administrative compliance team will review your report directly.
              </Text>

              <TextInput
                style={styles.modalTextInput}
                placeholder="Subject (e.g. Courier delay, Item discrepancy)"
                value={complaintSubject}
                onChangeText={setComplaintSubject}
              />

              <TextInput
                style={[styles.modalTextInput, { minHeight: 90, textAlignVertical: "top" }]}
                placeholder="Describe your issue in detail..."
                value={complaintDesc}
                onChangeText={setComplaintDesc}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setComplaintModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Submit Report"
                  loading={submittingComplaint}
                  onPress={handleSubmitComplaint}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Fullscreen Image Viewer Modal */}
        <ImageViewerModal
          visible={viewerVisible}
          images={viewerImages}
          initialIndex={viewerIndex}
          onClose={() => setViewerVisible(false)}
          title="Donation Photos"
        />

        {/* Phase 6: Coordination Chat Modal */}
        <ChatModal
          visible={!!activeChatDonation}
          donationId={activeChatDonation?.id || ""}
          donationTitle={activeChatDonation?.category?.name ? `${activeChatDonation.category.name} (${activeChatDonation.quantity} ${activeChatDonation.unit})` : undefined}
          onClose={() => setActiveChatDonation(null)}
        />

        {/* Phase 6: Delivery Rating Modal */}
        <RatingModal
          visible={!!activeRatingDonation}
          donationId={activeRatingDonation?.id || ""}
          targetRole={ratingTargetRole}
          targetName={
            ratingTargetRole === "NGO"
              ? activeRatingDonation?.acceptedByNgo?.name
              : activeRatingDonation?.assignment?.volunteer?.name
          }
          onClose={() => setActiveRatingDonation(null)}
          onSuccess={() => fetchDashboard()}
        />
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
    gap: Spacing.md,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.titleLarge,
    fontSize: 24,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  statCol: {
    width: "48%",
    minWidth: 140,
    flexGrow: 1,
  },
  actionCard: {
    padding: Spacing.md,
  },
  actionContent: {
    gap: Spacing.xs,
  },
  actionTitle: {
    ...Typography.titleSmall,
    fontSize: 16,
  },
  actionDesc: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    fontSize: 18,
  },
  list: {
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    ...Typography.caption,
    fontWeight: "700",
    color: Colors.primary,
  },
  quantityText: {
    ...Typography.titleSmall,
    fontSize: 18,
  },
  descriptionText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  imageRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 2,
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#f1f5f9",
  },
  footerInfo: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: Spacing.sm,
    gap: 4,
  },
  locationText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  ngoAcceptedText: {
    ...Typography.caption,
    color: Colors.textPrimary,
  },
  receiptBadge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  receiptText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },
  collabButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  chatActionBtn: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chatActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  rateActionBtn: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rateActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b45309",
  },
  emptyCard: {
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    ...Typography.titleSmall,
  },
  emptyDesc: {
    ...Typography.body,
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 13,
  },
  returnLink: {
    alignSelf: "center",
    marginVertical: Spacing.md,
  },
  returnText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  complaintActionCard: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  complaintActionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  complaintActionDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    maxWidth: 500,
    width: "100%",
    gap: Spacing.sm,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    ...Typography.body,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  lifetimeImpactCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  lifetimeImpactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  lifetimeImpactTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
  },
  lifetimeImpactSub: {
    fontSize: 12,
    color: "#166534",
    marginTop: 2,
  },
  estimateBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  estimateBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#15803d",
    letterSpacing: 0.5,
  },
  lifetimeMetricsGrid: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: Spacing.sm + 2,
    alignItems: "center",
  },
  lifetimeMetricItem: {
    flex: 1,
    alignItems: "center",
  },
  lifetimeMetricNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15803d",
  },
  lifetimeMetricText: {
    fontSize: 11,
    color: "#166534",
    marginTop: 2,
    textAlign: "center",
  },
  lifetimeDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#bbf7d0",
  },
});
