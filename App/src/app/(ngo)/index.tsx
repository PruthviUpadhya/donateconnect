import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Alert } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusChip } from "../../components/StatusChip";
import { ImageViewerModal } from "../../components/ImageViewerModal";
import { Colors, Spacing, Typography } from "../../theme/colors";
import { api } from "../../api/client";

export default function NgoDashboardScreen() {
  const [availableDonations, setAvailableDonations] = useState<any[]>([]);
  const [acceptedDonations, setAcceptedDonations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"AVAILABLE" | "ACCEPTED">("AVAILABLE");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchPipeline = async () => {
    try {
      // Fetch available incoming donations and accepted donations
      const [availRes, acceptedRes] = await Promise.all([
        api.request<{ success: boolean; data: { donations: any[] } }>("/ngo/donations/available").catch(() => ({ data: { donations: [] } })),
        api.request<{ success: boolean; data: { donations: any[] } }>("/ngo/donations").catch(() => ({ data: { donations: [] } })),
      ]);

      setAvailableDonations(availRes.data?.donations || []);
      setAcceptedDonations(acceptedRes.data?.donations || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPipeline();
  };

  const handleAccept = async (donationId: string) => {
    try {
      setActionLoadingId(donationId);
      await api.request(`/ngo/donations/${donationId}/accept`, {
        method: "POST",
      });
      // Refresh list
      await fetchPipeline();
      setActiveTab("ACCEPTED");
    } catch (err: any) {
      alert(err.message || "Failed to accept donation. Another NGO may have already accepted it.");
      fetchPipeline();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (donationId: string) => {
    try {
      setActionLoadingId(donationId);
      await api.request(`/ngo/donations/${donationId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: "Capacity full / out of jurisdiction" }),
      });
      await fetchPipeline();
    } catch (err: any) {
      alert(err.message || "Failed to reject donation");
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
        <View style={styles.topRow}>
          <View>
            <Text style={styles.title}>NGO Operations Hub</Text>
            <Text style={styles.subtitle}>Community donation triage & volunteer assignment</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "AVAILABLE" && styles.tabButtonActive]}
            onPress={() => setActiveTab("AVAILABLE")}
          >
            <Text style={[styles.tabText, activeTab === "AVAILABLE" && styles.tabTextActive]}>
              Available ({availableDonations.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "ACCEPTED" && styles.tabButtonActive]}
            onPress={() => setActiveTab("ACCEPTED")}
          >
            <Text style={[styles.tabText, activeTab === "ACCEPTED" && styles.tabTextActive]}>
              Accepted ({acceptedDonations.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={Typography.body}>Loading donation feed...</Text>
        ) : activeTab === "AVAILABLE" ? (
          availableDonations.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyTitle}>No Pending Donations</Text>
              <Text style={styles.emptyDesc}>
                There are no open community donations awaiting NGO pickup in your area right now.
              </Text>
            </Card>
          ) : (
            <View style={styles.list}>
              {availableDonations.map((d) => (
                <Card key={d.id} style={styles.card} variant="elevated">
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{d.category?.name || "Donation"}</Text>
                    </View>
                    <StatusChip status="PENDING" />
                  </View>

                  <Text style={styles.qtyText}>
                    {d.quantity} {d.unit}
                  </Text>
                  {d.description && <Text style={styles.descText}>{d.description}</Text>}

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
                          <Image source={{ uri: img.url }} style={styles.thumb} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.pickupText}>📍 Pickup Area: {d.pickupAddress}</Text>

                  <View style={styles.actionButtonsRow}>
                    <Button
                      title="Accept Donation"
                      size="sm"
                      loading={actionLoadingId === d.id}
                      onPress={() => handleAccept(d.id)}
                      style={{ flex: 2 }}
                    />
                    <Button
                      title="Decline"
                      size="sm"
                      variant="outline"
                      disabled={actionLoadingId === d.id}
                      onPress={() => handleReject(d.id)}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              ))}
            </View>
          )
        ) : (
          acceptedDonations.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Accepted Donations</Text>
              <Text style={styles.emptyDesc}>
                Accept incoming donations from the Available tab to organize volunteer pickups.
              </Text>
            </Card>
          ) : (
            <View style={styles.list}>
              {acceptedDonations.map((d) => (
                <Card key={d.id} style={styles.card} variant="elevated">
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{d.category?.name || "Donation"}</Text>
                    </View>
                    <StatusChip status={d.status} />
                  </View>

                  <Text style={styles.qtyText}>
                    {d.quantity} {d.unit}
                  </Text>
                  {d.description && <Text style={styles.descText}>{d.description}</Text>}

                  <View style={styles.donorInfoBox}>
                    <Text style={styles.donorName}>Donor: {d.donor?.name || "Anonymous Donor"}</Text>
                    <Text style={styles.pickupText}>📍 {d.donor?.address || d.pickupAddress}</Text>
                    {d.donor?.phone && <Text style={styles.phoneText}>📞 {d.donor?.phone}</Text>}
                  </View>

                  <Button
                    title="Assign Volunteer →"
                    size="sm"
                    variant="outline"
                    onPress={() => {}}
                  />
                </Card>
              ))}
            </View>
          )
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
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.titleLarge,
    fontSize: 24,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 13,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  list: {
    gap: Spacing.sm,
  },
  card: {
    padding: Spacing.md,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  qtyText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  descText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  imageRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
  },
  pickupText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  donorInfoBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 10,
    gap: 4,
  },
  donorName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  phoneText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyCard: {
    alignItems: "center",
    padding: Spacing.xl,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  returnLink: {
    alignSelf: "center",
    marginVertical: Spacing.md,
  },
  returnText: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
