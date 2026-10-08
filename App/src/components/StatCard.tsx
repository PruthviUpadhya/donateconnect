import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Card } from "./Card";
import { Colors, Spacing, Typography } from "../theme/colors";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, style }) => {
  return (
    <Card style={[styles.card, style]} variant="elevated">
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon}
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginVertical: 2,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.accentEmerald,
  },
});
