import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Colors, Spacing, Typography, BorderRadius } from "../theme/colors";
import { Button } from "./Button";
import { api } from "../api/client";

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  donationId: string;
  targetRole: "NGO" | "VOLUNTEER" | "DONOR";
  targetName?: string;
  onSuccess?: () => void;
}

export function RatingModal({
  visible,
  onClose,
  donationId,
  targetRole,
  targetName,
  onSuccess,
}: RatingModalProps) {
  const [stars, setStars] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await api.request("/ratings", {
        method: "POST",
        body: JSON.stringify({
          donationId,
          targetRole,
          rating: stars,
          feedback: feedback.trim() || undefined,
        }),
      });

      alert("Thank you! Your rating and review have been submitted.");
      setFeedback("");
      setStars(5);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            Rate {targetRole === "NGO" ? "Organization" : targetRole === "VOLUNTEER" ? "Volunteer" : "Donor"}
          </Text>
          <Text style={styles.subtitle}>
            {targetName ? `Share feedback for ${targetName}` : "How was your experience with this contribution?"}
          </Text>

          {/* Star selector */}
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setStars(s)}
                style={styles.starTouch}
                activeOpacity={0.7}
              >
                <Text style={[styles.starText, s <= stars ? styles.starFilled : styles.starEmpty]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.scoreText}>{stars} out of 5 Stars</Text>

          {/* Feedback input */}
          <TextInput
            style={styles.textInput}
            placeholder="Write a short review or appreciation (optional)..."
            placeholderTextColor="#94a3b8"
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={3}
          />

          <View style={styles.btnRow}>
            <Button
              title="Cancel"
              variant="outline"
              size="sm"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Submit Rating"
              size="sm"
              loading={loading}
              onPress={handleSubmit}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 420,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    ...Typography.titleSmall,
    fontSize: 18,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginVertical: Spacing.xs,
  },
  starTouch: {
    padding: 6,
  },
  starText: {
    fontSize: 34,
  },
  starFilled: {
    color: "#f59e0b",
  },
  starEmpty: {
    color: "#cbd5e1",
  },
  scoreText: {
    textAlign: "center",
    fontWeight: "600",
    color: Colors.textPrimary,
    fontSize: 13,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: BorderRadius.md,
    padding: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    minHeight: 70,
    textAlignVertical: "top",
  },
  btnRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
