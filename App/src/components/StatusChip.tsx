import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors, BorderRadius, Spacing } from "../theme/colors";

export type StatusType =
  | "PENDING"
  | "APPROVED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED";

interface StatusChipProps {
  status: StatusType | string;
  style?: ViewStyle;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, style }) => {
  const norm = status.toUpperCase();

  let chipColors = Colors.status.pending;
  if (norm === "APPROVED" || norm === "ACCEPTED") chipColors = Colors.status.approved;
  else if (norm === "ASSIGNED") chipColors = Colors.status.assigned;
  else if (norm === "PICKED_UP") chipColors = Colors.status.pickedUp;
  else if (norm === "DELIVERED") chipColors = Colors.status.delivered;
  else if (norm === "REJECTED") chipColors = Colors.status.rejected;
  else if (norm === "CANCELLED") chipColors = Colors.status.cancelled;

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: chipColors.bg,
          borderColor: chipColors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: chipColors.text }]}>{norm}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
});
