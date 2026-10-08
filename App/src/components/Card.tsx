import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Colors, BorderRadius, Spacing } from "../theme/colors";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "elevated" | "accent";
}

export const Card: React.FC<CardProps> = ({ children, style, variant = "default" }) => {
  return (
    <View
      style={[
        styles.card,
        variant === "accent" && styles.accentCard,
        variant === "elevated" && styles.elevatedCard,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
  },
  accentCard: {
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  elevatedCard: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
});
