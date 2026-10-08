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
} from "react-native";
import { X, ChevronLeft, ChevronRight } from "lucide-react-native";
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

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0);
    }
  }, [visible, initialIndex, images.length]);

  if (!visible || images.length === 0) return null;

  const currentUri = images[currentIndex];
  const hasMultiple = images.length > 1;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
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
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Main Image Container */}
        <View style={styles.imageContainer}>
          {loading && (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={StyleSheet.absoluteFill}
            />
          )}

          <Image
            source={{ uri: currentUri }}
            style={styles.image}
            resizeMode="contain"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
          />

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

        {/* Bottom Thumbnail Strip if multiple images */}
        {hasMultiple && (
          <View style={styles.thumbnailStrip}>
            {images.map((imgUri, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setCurrentIndex(idx)}
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
    backgroundColor: "rgba(0, 0, 0, 0.92)",
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
    fontWeight: "600",
  },
  counterText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
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
