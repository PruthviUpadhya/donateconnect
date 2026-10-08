import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusChip } from "../../components/StatusChip";
import { ImageViewerModal } from "../../components/ImageViewerModal";
import { Colors, Spacing, Typography } from "../../theme/colors";
import { api } from "../../api/client";

export default function DonorDashboardScreen() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchDonations = async () => {
    try {
      const res = await api.request<{ success: boolean; data: { donations: any[] } }>("/donations/mine");
      setDonations(res.data.donations || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDonations();
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
            <Text style={styles.subtitle}>Track your community contributions</Text>
          </View>
          <Button
            title="+ Donate"
            size="sm"
            onPress={() => router.push("/(donor)/create-donation")}
          />
        </View>

        {/* Quick Actions Card */}
        <Card style={styles.actionCard} variant="elevated">
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Have unused goods?</Text>
            <Text style={styles.actionDesc}>
              Clothes, surplus food, books, or devices can directly help verified local NGOs and sheltered families.
            </Text>
            <Button
              title="Create New Donation Request"
              onPress={() => router.push("/(donor)/create-donation")}
              style={{ marginTop: Spacing.xs }}
            />
          </View>
        </Card>

        {/* My Donations Stream */}
        <View style={styles.section}>
          <Text style={Typography.titleMedium}>My Donation Activity</Text>

          {loading ? (
            <Text style={Typography.body}>Loading your donations...</Text>
          ) : donations.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No Donations Yet</Text>
              <Text style={styles.emptyDesc}>
                You haven't listed any items for donation. Tap below to submit your first donation.
              </Text>
              <Button
                title="Start a Donation"
                size="sm"
                onPress={() => router.push("/(donor)/create-donation")}
              />
            </Card>
          ) : (
            <View style={styles.donationList}>
              {donations.map((d) => (
                <Card key={d.id} style={styles.donationCard} variant="elevated">
                  <View style={styles.cardHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{d.category?.name || "Donation"}</Text>
                    </View>
                    <StatusChip status={d.status} />
                  </View>

                  <Text style={styles.donationQty}>
                    {d.quantity} {d.unit}
                  </Text>

                  {d.description && (
                    <Text style={styles.donationDesc} numberOfLines={2}>
                      {d.description}
                    </Text>
                  )}

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
                        Accepted by: <Text style={{ fontWeight: "700" }}>{d.acceptedByNgo.name}</Text>
                      </Text>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

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
  },
  actionCard: {
    padding: Spacing.lg,
    backgroundColor: "#ffffff",
  },
  actionContent: {
    gap: 6,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  actionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  section: {
    gap: Spacing.sm,
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
    marginBottom: 6,
  },
  donationList: {
    gap: Spacing.sm,
  },
  donationCard: {
    padding: Spacing.md,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  donationQty: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  donationDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  imageRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
  },
  thumbImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
  },
  footerInfo: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  ngoAcceptedText: {
    fontSize: 12,
    color: Colors.accentEmerald,
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
