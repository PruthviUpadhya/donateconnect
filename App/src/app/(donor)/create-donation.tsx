import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { ImageViewerModal } from "../../components/ImageViewerModal";
import { Colors, Spacing, Typography } from "../../theme/colors";
import { api } from "../../api/client";
import { pickImage, uploadFile } from "../../utils/uploader";

interface CategoryItem {
  id: string;
  name: string;
  icon?: string;
}

const DEFAULT_ICONS: Record<string, string> = {
  Food: "🍱",
  Clothes: "👕",
  Books: "📚",
  "Medical supplies": "💊",
  Electronics: "💻",
  Furniture: "🪑",
  Other: "📦",
};

export default function CreateDonationScreen() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("items");
  const [description, setDescription] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");

  // Store photo objects with both local preview URI and server-uploaded URL
  const [photos, setPhotos] = useState<{ localUri: string; serverUrl: string }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Phase 7: Live Impact Estimation state
  const [impactEstimate, setImpactEstimate] = useState<any | null>(null);

  useEffect(() => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setImpactEstimate(null);
      return;
    }

    const catObj = categories.find((c) => c.id === selectedCategoryId || c.name === selectedCategoryId);
    const catName = catObj?.name || "Other";

    // Request deterministic impact estimate
    api.request<{ success: boolean; data: { estimate: any } }>(
      `/impact/estimate?categoryName=${encodeURIComponent(catName)}&quantity=${qty}`
    )
      .then((res) => {
        if (res.data?.estimate) {
          setImpactEstimate(res.data.estimate);
        }
      })
      .catch(() => {});
  }, [quantity, selectedCategoryId, categories]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.request<{ success: boolean; data: { categories: any[] } }>("/categories");
        if (res.data?.categories && res.data.categories.length > 0) {
          const mapped = res.data.categories.map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon || DEFAULT_ICONS[c.name] || "📦",
          }));
          setCategories(mapped);
          setSelectedCategoryId(mapped[0].id);
          return;
        }
      } catch (e) {
        console.warn("Failed to fetch categories from backend, using defaults:", e);
      }

      // Fallback
      setCategories([
        { id: "seed-food", name: "Food", icon: "🍱" },
        { id: "seed-clothes", name: "Clothes", icon: "👕" },
        { id: "seed-books", name: "Books", icon: "📚" },
        { id: "seed-med", name: "Medical supplies", icon: "💊" },
        { id: "seed-elec", name: "Electronics", icon: "💻" },
        { id: "seed-furn", name: "Furniture", icon: "🪑" },
        { id: "seed-other", name: "Other", icon: "📦" },
      ]);
    }

    loadCategories();
  }, []);

  const handlePickPhoto = async () => {
    try {
      const asset = await pickImage();
      if (!asset) return;

      // Add to local preview immediately so donor can see the photo right away
      const tempId = `local_${Date.now()}`;
      setPhotos((prev) => [
        ...prev,
        {
          localUri: asset.uri,
          serverUrl: "", // will be updated upon upload
        },
      ]);

      setUploadingImage(true);
      setError(null);

      // Upload to DB file storage
      const res = await uploadFile(
        asset.uri,
        asset.fileName || `donation_photo_${Date.now()}.jpg`,
        asset.mimeType || "image/jpeg"
      );

      // Update the serverUrl once uploaded
      setPhotos((prev) =>
        prev.map((p) => (p.localUri === asset.uri ? { ...p, serverUrl: res.url } : p))
      );
    } catch (err: any) {
      console.error("[handlePickPhoto error]:", err);
      setError(err.message || "Failed to upload photo");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreate = async () => {
    if (!quantity || !pickupAddress || !description) {
      setError("Please fill in the item quantity, description, and pickup location");
      return;
    }

    if (!selectedCategoryId) {
      setError("Please select a donation category");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Ensure finalCategoryId is a valid UUID
      let finalCategoryId = selectedCategoryId;
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

      if (!uuidRegex.test(finalCategoryId)) {
        // Query backend to get real UUIDs (auto-provisioned by backend)
        const catRes = await api.request<{ success: boolean; data: { categories: any[] } }>("/categories");
        const categoriesList = catRes.data?.categories || [];
        const found = categoriesList.find((c) => c.id === selectedCategoryId || c.name.toLowerCase() === selectedCategoryId.toLowerCase());

        if (found && uuidRegex.test(found.id)) {
          finalCategoryId = found.id;
        } else if (categoriesList.length > 0 && uuidRegex.test(categoriesList[0].id)) {
          finalCategoryId = categoriesList[0].id;
        } else {
          throw new Error("Unable to resolve donation category ID. Please reload the screen.");
        }
      }

      await api.request("/donations", {
        method: "POST",
        body: JSON.stringify({
          categoryId: finalCategoryId,
          quantity: parseFloat(quantity),
          unit,
          description,
          pickupAddress,
          imageUrls: photos.map((p) => p.serverUrl),
        }),
      });

      router.replace("/(donor)");
    } catch (err: any) {
      setError(err.message || "Failed to submit donation request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>New Donation Request</Text>
          <Text style={styles.subtitle}>
            Provide details of the items you wish to donate for nearby verified NGOs
          </Text>
        </View>

        <Card style={styles.formCard} variant="elevated">
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Category Chips */}
          <Text style={styles.sectionLabel}>Select Item Category *</Text>
          <View style={styles.categoryGrid}>
            {categories.map((c) => {
              const isSelected = selectedCategoryId === c.id || selectedCategoryId === c.name;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedCategoryId(c.id)}
                  style={[
                    styles.categoryPill,
                    isSelected ? styles.categoryPillActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected ? styles.categoryPillTextActive : null,
                    ]}
                  >
                    {c.icon} {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quantity and Unit */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Estimated Quantity *"
                placeholder="e.g. 10"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 110 }}>
              <Input
                label="Unit *"
                placeholder="items / kg"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>

          {/* Phase 7: Live Projected Impact Banner */}
          {impactEstimate && (
            <View style={styles.impactCard}>
              <View style={styles.impactCardHeader}>
                <Text style={styles.impactCardTitle}>🌱 Estimated Community & Eco Impact</Text>
                <View style={styles.estimateBadge}>
                  <Text style={styles.estimateBadgeText}>ESTIMATE</Text>
                </View>
              </View>
              <Text style={styles.impactDescription}>{impactEstimate.description}</Text>
              <View style={styles.impactMetricsRow}>
                <View style={styles.impactMetricItem}>
                  <Text style={styles.impactMetricValue}>~{impactEstimate.estimatedPeopleHelped}</Text>
                  <Text style={styles.impactMetricLabel}>People Benefited</Text>
                </View>
                <View style={styles.impactMetricDivider} />
                <View style={styles.impactMetricItem}>
                  <Text style={styles.impactMetricValue}>{impactEstimate.co2DivertedKg} kg</Text>
                  <Text style={styles.impactMetricLabel}>CO₂ Diverted</Text>
                </View>
              </View>
            </View>
          )}

          {/* Description */}
          <Input
            label="Item Description & Notes *"
            placeholder="e.g. 5 winter coats, 2 blankets in clean and wearable condition"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{ height: 75 }}
          />

          {/* Pickup Location */}
          <Input
            label="Pickup Address / Landmark *"
            placeholder="House #12, 5th Cross, Indiranagar, Bengaluru"
            value={pickupAddress}
            onChangeText={setPickupAddress}
          />

          {/* Photos Section */}
          <View style={styles.photoHeaderRow}>
            <Text style={styles.sectionLabel}>Item Photos</Text>
            {photos.length > 0 && (
              <Text style={styles.photoCountText}>
                {photos.length} uploaded • Tap to view large
              </Text>
            )}
          </View>
          <View style={styles.photoContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoList}>
              {photos.map((item, idx) => (
                <View key={idx} style={styles.previewImageWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setViewerIndex(idx);
                      setViewerVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: item.localUri || item.serverUrl }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <View style={styles.zoomBadge}>
                      <Text style={styles.zoomBadgeText}>🔍 View</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {/* Delete photo thumbnail button */}
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removePhotoBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePickPhoto}
                disabled={uploadingImage}
                style={styles.addPhotoBox}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Text style={styles.addPhotoIcon}>📷</Text>
                    <Text style={styles.addPhotoText}>+ Add Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>

          <Button
            title="Publish Donation Request"
            onPress={handleCreate}
            loading={loading}
            style={{ marginTop: Spacing.sm }}
          />
        </Card>

        <TouchableOpacity onPress={() => router.back()} style={styles.cancelLink}>
          <Text style={styles.cancelText}>← Cancel and Return</Text>
        </TouchableOpacity>

        {/* Fullscreen Image Viewer Modal */}
        <ImageViewerModal
          visible={viewerVisible}
          images={photos.map((p) => p.localUri || p.serverUrl)}
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
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    gap: Spacing.md,
  },
  header: {
    alignItems: "center",
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  title: {
    ...Typography.titleLarge,
    fontSize: 24,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 13,
    textAlign: "center",
  },
  formCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionLabel: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryPill: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  categoryPillActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  categoryPillTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  photoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  photoCountText: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.primary,
  },
  photoContainer: {
    marginVertical: 4,
  },
  photoList: {
    gap: 10,
    alignItems: "center",
  },
  previewImageWrapper: {
    position: "relative",
  },
  removePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#e11d48",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  removePhotoBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 13,
  },
  previewImage: {
    width: 76,
    height: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  zoomBadge: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  zoomBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "600",
  },
  addPhotoBox: {
    width: 76,
    height: 76,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    gap: 2,
  },
  addPhotoIcon: {
    fontSize: 18,
  },
  addPhotoText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
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
  cancelLink: {
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  cancelText: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  impactCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 8,
    padding: Spacing.sm + 4,
    gap: 6,
    marginVertical: 4,
  },
  impactCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  impactCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
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
  impactDescription: {
    fontSize: 12,
    color: "#166534",
    lineHeight: 16,
  },
  impactMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 8,
    marginTop: 2,
  },
  impactMetricItem: {
    flex: 1,
    alignItems: "center",
  },
  impactMetricValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#15803d",
  },
  impactMetricLabel: {
    fontSize: 10,
    color: "#166534",
    marginTop: 1,
  },
  impactMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#bbf7d0",
  },
});
