import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusChip } from "../../components/StatusChip";
import { ImageViewerModal } from "../../components/ImageViewerModal";
import { ChatModal } from "../../components/ChatModal";
import { Colors, Spacing, Typography, BorderRadius } from "../../theme/colors";
import { api } from "../../api/client";
import { pickImage, uploadFile } from "../../utils/uploader";
import { openGoogleMapsNavigation } from "../../utils/googleMaps";

export default function VolunteerDashboardScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [rewardsData, setRewardsData] = useState<{ karmaPoints: number; events: any[] } | null>(null);
  const [availability, setAvailability] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Chat state
  const [activeChatDonation, setActiveChatDonation] = useState<any | null>(null);

  // Delivery Proof Photo state
  const [proofUploadingId, setProofUploadingId] = useState<string | null>(null);
  const [proofPhotos, setProofPhotos] = useState<Record<string, string>>({});

  // Fullscreen Image Viewer Modal state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchTasks = async () => {
    try {
      const [tasksRes, rewardsRes] = await Promise.all([
        api.request<{
          success: boolean;
          data: { profile: any; tasks: any[] };
        }>("/volunteer/tasks"),
        api.request<{
          success: boolean;
          data: { karmaPoints: number; events: any[] };
        }>("/volunteer/rewards").catch(() => ({ data: null })),
      ]);

      setTasks(tasksRes.data?.tasks || []);
      setProfile(tasksRes.data?.profile || null);
      if (rewardsRes?.data) {
        setRewardsData(rewardsRes.data);
      }
      if (tasksRes.data?.profile) {
        setAvailability(tasksRes.data.profile.availability);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleToggleAvailability = async (value: boolean) => {
    try {
      setAvailability(value);
      await api.request("/volunteer/availability", {
        method: "PATCH",
        body: JSON.stringify({ availability: value }),
      });
    } catch {
      setAvailability(!value);
    }
  };

  const handleConfirmPickup = async (taskId: string) => {
    try {
      setActionLoadingId(taskId);
      await api.request(`/volunteer/tasks/${taskId}/pickup`, {
        method: "POST",
      });
      await fetchTasks();
    } catch (err: any) {
      alert(err.message || "Failed to confirm pickup");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUploadProofPhoto = async (taskId: string) => {
    try {
      const asset = await pickImage();
      if (!asset) return;

      setProofUploadingId(taskId);
      const res = await uploadFile(
        asset.uri,
        asset.fileName || `delivery_proof_${Date.now()}.jpg`,
        asset.mimeType || "image/jpeg"
      );

      setProofPhotos((prev) => ({ ...prev, [taskId]: res.url }));
    } catch (err: any) {
      alert(err.message || "Failed to upload delivery proof photo");
    } finally {
      setProofUploadingId(null);
    }
  };

  const handleCompleteDelivery = async (taskId: string) => {
    const proofUrl = proofPhotos[taskId];
    if (!proofUrl) {
      alert("Please take or upload a proof of delivery photo before completing.");
      return;
    }

    try {
      setActionLoadingId(taskId);
      const res = await api.request<{
        success: boolean;
        message: string;
        data: { receipt: any };
      }>(`/volunteer/tasks/${taskId}/deliver`, {
        method: "POST",
        body: JSON.stringify({
          proofPhotoUrl: proofUrl,
          notes: "Safely handed over to NGO team",
        }),
      });

      alert(res.message || "Delivery verified! Receipt generated.");
      await fetchTasks();
    } catch (err: any) {
      alert(err.message || "Failed to complete delivery");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header & Stats Banner */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Volunteer Field Hub</Text>
            <Text style={styles.subtitle}>Active pickups, donor navigation & delivery verification</Text>
          </View>
        </View>

        {/* Status Card & Availability Switch */}
        <Card style={styles.statsCard} variant="elevated">
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.availabilityLabel}>Duty Status</Text>
              <Text style={styles.availabilityStatus}>
                {availability ? "🟢 Ready for Pickups" : "⚪ Offline / Resting"}
              </Text>
            </View>
            <Switch
              value={availability}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
              thumbColor={availability ? Colors.primary : "#f8fafc"}
            />
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{profile?.tasksCompleted || 0}</Text>
              <Text style={styles.metricLabel}>Deliveries Done</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{profile?.rewardPoints || 0}</Text>
              <Text style={styles.metricLabel}>Karma Points</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{profile?.ratingAvg ? profile.ratingAvg.toFixed(1) : "5.0"} ⭐</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
          </View>
        </Card>

        {/* Assigned Tasks Feed */}
        <Text style={styles.sectionTitle}>
          Assigned Tasks ({tasks.length})
        </Text>

        {loading ? (
          <Text style={Typography.body}>Loading your assignments...</Text>
        ) : tasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🚴</Text>
            <Text style={styles.emptyTitle}>No Pending Tasks</Text>
            <Text style={styles.emptyDesc}>
              When your partner NGOs dispatch a donation pickup to you, it will appear here with donor directions.
            </Text>
          </Card>
        ) : (
          <View style={styles.tasksList}>
            {tasks.map((task) => {
              const donation = task.donation;
              const ngo = task.ngo;
              const isAssigned = task.status === "ASSIGNED";
              const isPickedUp = task.status === "PICKED_UP";
              const isDelivered = task.status === "DELIVERED";

              return (
                <Card key={task.id} style={styles.taskCard} variant="elevated">
                  {/* Card Header */}
                  <View style={styles.taskHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {donation?.category?.name || "Donation"}
                      </Text>
                    </View>
                    <StatusChip status={task.status} />
                  </View>

                  <Text style={styles.itemTitle}>
                    {donation?.quantity} {donation?.unit} — {donation?.description || "Package"}
                  </Text>

                  {/* Item Photos */}
                  {donation?.images && donation.images.length > 0 && (
                    <View style={styles.thumbRow}>
                      {donation.images.map((img: any, idx: number) => (
                        <TouchableOpacity
                          key={img.id || idx}
                          activeOpacity={0.8}
                          onPress={() => {
                            setViewerImages(donation.images.map((i: any) => i.url));
                            setViewerIndex(idx);
                            setViewerVisible(true);
                          }}
                        >
                          <Image source={{ uri: img.url }} style={styles.thumb} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Step 1: Donor Pickup Location (Accessible only upon assignment) */}
                  <View style={styles.stepBox}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.stepTitle}>1. PICKUP LOCATION (DONOR)</Text>
                      {donation?.pickupAddress && (
                        <TouchableOpacity
                          style={styles.mapsBtn}
                          onPress={() => openGoogleMapsNavigation(donation.pickupAddress)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.mapsBtnText}>🗺️ Navigate (Maps)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.addressText}>📍 {donation?.pickupAddress}</Text>
                    <Text style={styles.contactText}>
                      Donor: {donation?.donor?.name || "Verified Donor"} • 📞 {donation?.donor?.phone || "Phone hidden"}
                    </Text>
                  </View>

                  {/* Step 2: Destination NGO */}
                  <View style={styles.stepBox}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={styles.stepTitle}>2. DESTINATION (NGO HUB)</Text>
                      {(task.deliveryAddressSnap || ngo?.address) && (
                        <TouchableOpacity
                          style={styles.mapsBtn}
                          onPress={() => openGoogleMapsNavigation(task.deliveryAddressSnap || ngo?.address)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.mapsBtnText}>🗺️ Navigate (Maps)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.addressText}>🏢 {ngo?.name}</Text>
                    <Text style={styles.contactText}>
                      Address: {task.deliveryAddressSnap || ngo?.address} • 📞 {ngo?.contactNumber}
                    </Text>
                  </View>

                  {/* Action Buttons based on lifecycle status */}
                  <View style={styles.volunteerTaskActionsRow}>
                    <TouchableOpacity
                      style={styles.chatActionBtn}
                      activeOpacity={0.8}
                      onPress={() => setActiveChatDonation(donation)}
                    >
                      <Text style={styles.chatActionBtnText}>💬 Chat with Donor / NGO</Text>
                    </TouchableOpacity>
                  </View>

                  {isAssigned && (
                    <Button
                      title="✓ Confirm Pickup at Donor Spot"
                      loading={actionLoadingId === task.id}
                      onPress={() => handleConfirmPickup(task.id)}
                      style={{ marginTop: Spacing.xs }}
                    />
                  )}

                  {isPickedUp && (
                    <View style={styles.deliverySection}>
                      <Text style={styles.proofLabel}>Proof of Delivery (Photo Required):</Text>

                      {proofPhotos[task.id] ? (
                        <View style={styles.proofSuccessBox}>
                          <Image
                            source={{ uri: proofPhotos[task.id] }}
                            style={styles.proofPreview}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.proofReadyText}>✓ Photo Captured</Text>
                            <Button
                              title="Retake"
                              size="sm"
                              variant="outline"
                              onPress={() => handleUploadProofPhoto(task.id)}
                            />
                          </View>
                        </View>
                      ) : (
                        <Button
                          title="📷 Snap / Upload Proof Photo"
                          variant="outline"
                          loading={proofUploadingId === task.id}
                          onPress={() => handleUploadProofPhoto(task.id)}
                        />
                      )}

                      <Button
                        title="🎉 Mark Delivered & Generate Receipt"
                        loading={actionLoadingId === task.id}
                        onPress={() => handleCompleteDelivery(task.id)}
                        style={{ marginTop: Spacing.xs }}
                      />
                    </View>
                  )}

                  {isDelivered && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>
                        ✓ Successfully Delivered on {new Date(task.deliveredAt).toLocaleTimeString()}
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* Phase 6: Karma Points & Rewards History Card */}
        {rewardsData && (
          <Card style={styles.rewardsCard} variant="elevated">
            <View style={styles.rewardsHeader}>
              <View>
                <Text style={styles.rewardsTitle}>🌟 Karma Points & Rewards</Text>
                <Text style={styles.rewardsSub}>
                  Earned {rewardsData.karmaPoints} karma points supporting humanitarian relief
                </Text>
              </View>
            </View>

            {rewardsData.events.length === 0 ? (
              <Text style={styles.emptyRewardsText}>
                No karma events logged yet. Complete deliveries to earn points!
              </Text>
            ) : (
              <View style={styles.rewardEventsList}>
                {rewardsData.events.map((ev: any) => (
                  <View key={ev.id} style={styles.rewardEventItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rewardEventDesc}>{ev.reason || "Delivery Bonus"}</Text>
                      <Text style={styles.rewardEventDate}>
                        {new Date(ev.createdAt).toLocaleDateString()} • {new Date(ev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsBadgeText}>+{ev.points} pts</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        <TouchableOpacity onPress={() => router.replace("/")} style={styles.returnLink}>
          <Text style={styles.returnText}>← Back to Main Hub</Text>
        </TouchableOpacity>

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
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  header: {
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
  statsCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  availabilityLabel: {
    ...Typography.caption,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  availabilityStatus: {
    ...Typography.titleSmall,
    fontSize: 15,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricItem: {
    alignItems: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#e2e8f0",
  },
  sectionTitle: {
    ...Typography.titleMedium,
    fontSize: 18,
  },
  tasksList: {
    gap: Spacing.md,
  },
  taskCard: {
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  taskHeader: {
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
  categoryBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "700",
  },
  itemTitle: {
    ...Typography.titleSmall,
    fontSize: 17,
  },
  thumbRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 2,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#f1f5f9",
  },
  stepBox: {
    backgroundColor: "#f8fafc",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 3,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  mapsBtn: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mapsBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  addressText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  deliverySection: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  proofLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  proofSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#f0fdf4",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  proofPreview: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  proofReadyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 4,
  },
  completedBadge: {
    backgroundColor: "#f0fdf4",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
  },
  completedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
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
  volunteerTaskActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  chatActionBtn: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chatActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  rewardsCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: "#fdf8f6",
    borderColor: "#fed7aa",
    borderWidth: 1,
  },
  rewardsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rewardsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9a3412",
  },
  rewardsSub: {
    fontSize: 12,
    color: "#7c2d12",
    marginTop: 2,
  },
  emptyRewardsText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  rewardEventsList: {
    gap: 8,
    marginTop: 4,
  },
  rewardEventItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  rewardEventDesc: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  rewardEventDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pointsBadge: {
    backgroundColor: "#ffedd5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c2410c",
  },
});
