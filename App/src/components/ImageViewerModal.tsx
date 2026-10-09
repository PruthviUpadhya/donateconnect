import React from "react";
import {
  Modal,
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Linking from "expo-linking";
import { X, ChevronLeft, ChevronRight, ExternalLink, FileText, Download } from "lucide-react-native";
import { Colors, Spacing, Typography, BorderRadius } from "../theme/colors";

interface ImageViewerModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

export function ImageViewerModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
  title,
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0);
      setLoadError(false);
    }
  }, [visible, initialIndex, images.length]);

  if (!visible || images.length === 0) return null;

  const currentUri = images[currentIndex];
  const hasMultiple = images.length > 1;

  // Detect if current file is likely a PDF
  const isPdf =
    currentUri?.toLowerCase().includes(".pdf") ||
    title?.toLowerCase().includes("certificate") ||
    title?.toLowerCase().includes("pan") ||
    title?.toLowerCase().includes("document");

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setLoadError(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setLoadError(false);
    }
  };

  const handleOpenExternally = async () => {
    try {
      const canOpen = await Linking.canOpenURL(currentUri);
      if (canOpen) {
        await Linking.openURL(currentUri);
      } else {
        await Linking.openURL(currentUri);
      }
    } catch {
      Alert.alert("Unable to open", "Could not open document link externally.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {title && <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>}
            {hasMultiple && (
              <Text style={styles.counterText}>
                {currentIndex + 1} of {images.length}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleOpenExternally}
              accessibilityLabel="Open document in browser"
            >
              <ExternalLink size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.imageContainer}>
          {loading && !loadError && (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={StyleSheet.absoluteFill}
            />
          )}

          {isPdf && Platform.OS === "web" ? (
            // On Web: embed PDF viewer directly in the current page/modal without navigating away
            <View style={styles.webPdfContainer}>
              {/* @ts-ignore */}
              <iframe
                src={currentUri}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: 12,
                }}
                title="Document Preview"
              />
            </View>
          ) : !loadError && !isPdf ? (
            <Image
              source={{ uri: currentUri }}
              style={styles.image}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setLoadError(true);
              }}
            />
          ) : (
            // PDF Document in-modal card for mobile devices
            <View style={styles.fallbackCard}>
              <View style={styles.fallbackIconCircle}>
                <FileText size={48} color={Colors.primary} />
              </View>
              <Text style={styles.fallbackTitle}>
                {title || (isPdf ? "Official PDF Document" : "Document Preview")}
              </Text>
              <Text style={styles.fallbackDesc}>
                This official file is saved in secure database storage. You can inspect it directly or open with your preferred system viewer.
              </Text>

              <TouchableOpacity
                style={styles.openDocButton}
                activeOpacity={0.8}
                onPress={handleOpenExternally}
              >
                <Download size={18} color="#FFFFFF" />
                <Text style={styles.openDocButtonText}>Open Document Reader</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Left / Right navigation arrows */}
          {hasMultiple && currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={handlePrev}
              activeOpacity={0.8}
            >
              <ChevronLeft size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {hasMultiple && currentIndex < images.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <ChevronRight size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Bar with direct Open button for easy access */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomLinkButton}
            onPress={handleOpenExternally}
          >
            <ExternalLink size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.bottomLinkText}>Open Full File in Browser / Viewer</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Thumbnail Strip if multiple images */}
        {hasMultiple && (
          <View style={styles.thumbnailStrip}>
            {images.map((imgUri, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setCurrentIndex(idx);
                    setLoadError(false);
                  }}
                  style={[
                    styles.thumbnailWrapper,
                    isSelected ? styles.thumbnailSelected : null,
                  ]}
                >
                  <Image source={{ uri: imgUri }} style={styles.thumbnail} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </Modal>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.94)",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    width: "100%",
    paddingTop: Platform.OS === "ios" ? 54 : 32,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  counterText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    marginTop: 2,
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  image: {
    width: screenWidth * 0.95,
    height: screenHeight * 0.72,
  },
  webPdfContainer: {
    width: "90%",
    maxWidth: 960,
    height: "85%",
    backgroundColor: "#ffffff",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  fallbackCard: {
    backgroundColor: "#ffffff",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    maxWidth: 340,
    width: "88%",
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  fallbackIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  fallbackTitle: {
    ...Typography.titleSmall,
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  fallbackDesc: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  openDocButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  openDocButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  bottomBar: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
  },
  bottomLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  bottomLinkText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  navButton: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  thumbnailStrip: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
    width: "100%",
  },
  thumbnailWrapper: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    opacity: 0.6,
  },
  thumbnailSelected: {
    borderColor: Colors.primary,
    opacity: 1,
    transform: [{ scale: 1.08 }],
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
});
