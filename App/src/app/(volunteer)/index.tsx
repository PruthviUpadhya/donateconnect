import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Colors, Spacing, Typography } from "../../theme/colors";

export default function VolunteerDashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={Typography.titleLarge}>Volunteer Dashboard</Text>
      <Text style={Typography.body}>
        Accept pickup assignments, navigate to pickup spots, and deliver to partner NGOs.
      </Text>

      <Card style={styles.card} variant="accent">
        <Text style={Typography.titleSmall}>Assigned Delivery Tasks</Text>
        <Text style={[Typography.body, { marginVertical: Spacing.xs }]}>
          Tasks assigned directly to you by your affiliated NGOs will appear here.
        </Text>
        <Button title="Check Active Tasks" onPress={() => {}} />
      </Card>

      <Button title="← Return to Portal Hub" variant="outline" onPress={() => router.replace("/")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
  },
});
