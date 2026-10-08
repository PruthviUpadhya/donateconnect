import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusChip } from "../../components/StatusChip";
import { StatCard } from "../../components/StatCard";
import { ImageViewerModal } from "../../components/ImageViewerModal";
import { Colors, Spacing, Typography, BorderRadius } from "../../theme/colors";
import { api } from "../../api/client";

type AdminTab = "stats" | "ngos" | "users" | "donations" | "complaints";

export default function AdminDashboardScreen() {
  const [activeTab, setActiveTab] = useState<AdminTab>("stats");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [pendingNgos, setPendingNgos] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Reject NGO modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectNgoId, setRejectNgoId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Resolve Complaint modal
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [resolvingComplaintId, setResolvingComplaintId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  // Image Viewer Modal state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerTitle, setViewerTitle] = useState("Document Viewer");

  const fetchAdminData = async () => {
    try {
      // 1. Fetch stats
      const statsRes = await api.request<{ success: boolean; data: any }>("/admin/stats").catch(() => null);
      if (statsRes?.data) setStats(statsRes.data);

      // 2. Fetch Pending NGOs
      const ngosRes = await api.request<{ success: boolean; data: { ngos: any[] } }>("/admin/ngos/pending").catch(() => null);
      if (ngosRes?.data) setPendingNgos(ngosRes.data.ngos || []);

      // 3. Fetch Users
      const usersRes = await api.request<{ success: boolean; data: { users: any[] } }>("/admin/users").catch(() => null);
      if (usersRes?.data) setUsers(usersRes.data.users || []);

      // 4. Fetch Donations
      const donationsRes = await api.request<{ success: boolean; data: { donations: any[] } }>("/admin/donations").catch(() => null);
      if (donationsRes?.data) setDonations(donationsRes.data.donations || []);

      // 5. Fetch Complaints
      const complaintsRes = await api.request<{ success: boolean; data: { complaints: any[] } }>("/admin/complaints").catch(() => null);
      if (complaintsRes?.data) setComplaints(complaintsRes.data.complaints || []);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  // NGO Verification handlers
  const handleApproveNgo = async (ngoId: string) => {
    try {
      setActionLoadingId(ngoId);
      await api.request(`/admin/ngos/${ngoId}/verify`, {
        method: "POST",
        body: JSON.stringify({ action: "APPROVE" }),
      });
      Alert.alert("Success", "NGO registration has been approved!");
      fetchAdminData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to approve NGO");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenRejectNgo = (ngoId: string) => {
    setRejectNgoId(ngoId);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const handleConfirmRejectNgo = async () => {
    if (!rejectNgoId) return;
    try {
      setActionLoadingId(rejectNgoId);
      await api.request(`/admin/ngos/${rejectNgoId}/verify`, {
        method: "POST",
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason: rejectReason.trim() || "Documents did not pass verification guidelines.",
        }),
      });
      setRejectModalVisible(false);
      Alert.alert("Recorded", "NGO verification rejected.");
      fetchAdminData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reject NGO");
    } finally {
      setActionLoadingId(null);
    }
  };

  // User status toggle handler
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      setActionLoadingId(userId);
      await api.request(`/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      Alert.alert("User Updated", `User status changed to ${newStatus}.`);
      fetchAdminData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update user status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Complaint resolution handler
  const handleOpenResolveComplaint = (complaintId: string) => {
    setResolvingComplaintId(complaintId);
    setResolutionText("");
    setResolveModalVisible(true);
  };

  const handleConfirmResolveComplaint = async () => {
    if (!resolvingComplaintId || !resolutionText.trim()) {
      Alert.alert("Required", "Please enter a resolution summary.");
      return;
    }
    try {
      setActionLoadingId(resolvingComplaintId);
      await api.request(`/admin/complaints/${resolvingComplaintId}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          resolution: resolutionText.trim(),
          status: "RESOLVED",
        }),
      });
      setResolveModalVisible(false);
      Alert.alert("Resolved", "Complaint has been marked as resolved.");
      fetchAdminData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to resolve complaint");
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
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Platform Administration</Text>
            <Text style={styles.subtitle}>
              Verification queue, user governance, complaints & platform telemetry
            </Text>
          </View>
        </View>

        {/* Tab Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          <View style={styles.tabRow}>
            {(
              [
                { key: "stats", label: "Overview", icon: "📊" },
                { key: "ngos", label: `NGO Queue (${pendingNgos.length})`, icon: "🏢" },
                { key: "users", label: `Users (${users.length})`, icon: "👥" },
                { key: "donations", label: `Donations (${donations.length})`, icon: "📦" },
                { key: "complaints", label: `Complaints (${complaints.filter(c => c.status === "OPEN").length})`, icon: "⚠️" },
              ] as const
            ).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.body, { marginTop: Spacing.sm }]}>
              Loading administration metrics...
            </Text>
          </View>
        ) : (
          <>
            {/* 1. OVERVIEW / STATS TAB */}
            {activeTab === "stats" && (
              <View style={styles.sectionGap}>
                <Text style={styles.sectionHeader}>Platform Growth & Health</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCol}>
                    <StatCard
                      title="Total Users"
                      value={stats?.users?.total || 0}
                      subtitle={`${stats?.users?.donors || 0} Donors`}
                      icon={<Text style={{ fontSize: 18 }}>👥</Text>}
                    />
                  </View>
                  <View style={styles.statCol}>
                    <StatCard
                      title="NGOs"
                      value={stats?.ngos?.total || 0}
                      subtitle={`${stats?.ngos?.pending || 0} Pending`}
                      icon={<Text style={{ fontSize: 18 }}>🏢</Text>}
                    />
                  </View>
                  <View style={styles.statCol}>
                    <StatCard
                      title="Donations"
                      value={stats?.donations?.total || 0}
                      subtitle={`${stats?.donations?.delivered || 0} Delivered`}
                      icon={<Text style={{ fontSize: 18 }}>🎁</Text>}
                    />
                  </View>
                  <View style={styles.statCol}>
                    <StatCard
                      title="Stock Units"
                      value={stats?.donations?.activeStockUnits || 0}
                      subtitle="Live in Hubs"
                      icon={<Text style={{ fontSize: 18 }}>📦</Text>}
                    />
                  </View>
                </View>

                {/* Governance Summary Card */}
                <Card style={styles.summaryCard} variant="elevated">
                  <Text style={styles.summaryTitle}>Governance & Compliance</Text>
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{stats?.governance?.openComplaints || 0}</Text>
                      <Text style={styles.summaryLabel}>Open Grievances</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{stats?.governance?.fraudFlagsCount || 0}</Text>
                      <Text style={styles.summaryLabel}>Active Fraud Flags</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{stats?.users?.volunteers || 0}</Text>
                      <Text style={styles.summaryLabel}>Active Couriers</Text>
                    </View>
                  </View>
                </Card>

                {/* Quick Info Box */}
                <Card style={styles.infoCard}>
                  <Text style={styles.infoTitle}>🛡️ Audit Compliance Notice</Text>
                  <Text style={styles.infoText}>
                    All administrative operations, NGO verifications, user suspensions, and grievance closures are permanently logged in the immutable AuditLog ledger for regulatory compliance.
                  </Text>
                </Card>
              </View>
            )}

            {/* 2. NGO VERIFICATION QUEUE TAB */}
            {activeTab === "ngos" && (
              <View style={styles.sectionGap}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeader}>Pending NGO Applications</Text>
                  <Text style={styles.badgeCount}>{pendingNgos.length} Pending</Text>
                </View>

                {pendingNgos.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>🎉</Text>
                    <Text style={styles.emptyTitle}>Queue All Clear</Text>
                    <Text style={styles.emptyDesc}>
                      There are no pending NGO verification requests waiting for review.
                    </Text>
                  </Card>
                ) : (
                  pendingNgos.map((ngo) => {
                    const docList: { title: string; url: string }[] = [];
                    if (ngo.registrationCertificateUrl) {
                      docList.push({ title: "Govt Registration Certificate", url: ngo.registrationCertificateUrl });
                    }
                    if (ngo.panCardUrl) {
                      docList.push({ title: "PAN Card / Tax Document", url: ngo.panCardUrl });
                    }
                    if (ngo.addressProofUrl) {
                      docList.push({ title: "Address Proof", url: ngo.addressProofUrl });
                    }
                    if (Array.isArray(ngo.documents)) {
                      ngo.documents.forEach((d: string, idx: number) => {
                        docList.push({ title: `Document ${idx + 1}`, url: d });
                      });
                    }

                    return (
                      <Card key={ngo.id} style={styles.itemCard} variant="elevated">
                        <View style={styles.itemHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.ngoName}>{ngo.name}</Text>
                            <Text style={styles.ngoRegNo}>Official Email: {ngo.officialEmail}</Text>
                          </View>
                          <StatusChip status={ngo.verificationStatus} />
                        </View>

                        {ngo.description && (
                          <Text style={styles.itemDesc}>{ngo.description}</Text>
                        )}

                        <View style={styles.ownerBox}>
                          <Text style={styles.ownerLabel}>Applicant Details:</Text>
                          <Text style={styles.ownerText}>{ngo.owner?.name} ({ngo.owner?.email})</Text>
                          {ngo.contactNumber && <Text style={styles.ownerText}>Phone: {ngo.contactNumber}</Text>}
                          {ngo.address && <Text style={styles.ownerText}>Address: {ngo.address}</Text>}
                          {ngo.websiteUrl && <Text style={styles.ownerText}>Website: {ngo.websiteUrl}</Text>}
                        </View>

                        {/* Documents Section */}
                        {docList.length > 0 ? (
                          <View style={styles.docSection}>
                            <Text style={styles.docTitle}>Uploaded Compliance Documents:</Text>
                            <View style={styles.docRow}>
                              {docList.map((docItem, idx: number) => (
                                <TouchableOpacity
                                  key={idx}
                                  style={styles.docBadge}
                                  onPress={() => {
                                    setViewerImages([docItem.url]);
                                    setViewerTitle(`${ngo.name} - ${docItem.title}`);
                                    setViewerVisible(true);
                                  }}
                                >
                                  <Text style={styles.docBadgeText}>📄 {docItem.title} ↗</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        ) : (
                          <View style={styles.docSection}>
                            <Text style={[Typography.caption, { color: Colors.textSecondary, fontStyle: "italic" }]}>
                              No documents uploaded.
                            </Text>
                          </View>
                        )}

                        {/* Actions */}
                        <View style={styles.actionRow}>
                          <Button
                            title="✓ Approve NGO"
                            size="sm"
                            loading={actionLoadingId === ngo.id}
                            onPress={() => handleApproveNgo(ngo.id)}
                            style={{ flex: 1 }}
                          />
                          <Button
                            title="✕ Reject"
                            variant="outline"
                            size="sm"
                            onPress={() => handleOpenRejectNgo(ngo.id)}
                            style={{ flex: 1, borderColor: Colors.accentRose }}
                          />
                        </View>
                      </Card>
                    );
                  })
                )}
              </View>
            )}

            {/* 3. USER MANAGEMENT TAB */}
            {activeTab === "users" && (
              <View style={styles.sectionGap}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeader}>Platform Users</Text>
                  <Text style={styles.badgeCount}>{users.length} Users</Text>
                </View>

                {users.map((u) => {
                  const isSuspended = u.status === "SUSPENDED";
                  return (
                    <Card key={u.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.userName}>{u.name}</Text>
                            <View style={[styles.roleBadge, { backgroundColor: u.role === "ADMIN" ? "#fef3c7" : "#e0f2fe" }]}>
                              <Text style={[styles.roleText, { color: u.role === "ADMIN" ? "#b45309" : "#0369a1" }]}>
                                {u.role}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.userEmail}>{u.email}</Text>
                          {u.phone && <Text style={styles.userPhone}>📞 {u.phone}</Text>}
                        </View>

                        <StatusChip status={u.status} />
                      </View>

                      {u.ownedNgo && (
                        <View style={styles.miniDetail}>
                          <Text style={Typography.caption}>
                            Managed NGO: <Text style={{ fontWeight: "700" }}>{u.ownedNgo.name}</Text> ({u.ownedNgo.verificationStatus})
                          </Text>
                        </View>
                      )}

                      {u.volunteerProfile && (
                        <View style={styles.miniDetail}>
                          <Text style={Typography.caption}>
                            Volunteer Stats: {u.volunteerProfile.tasksCompleted} deliveries completed • {u.volunteerProfile.ratingAvg ? u.volunteerProfile.ratingAvg.toFixed(1) : "5.0"} ⭐
                          </Text>
                        </View>
                      )}

                      {u.role !== "ADMIN" && (
                        <View style={{ marginTop: Spacing.sm }}>
                          <Button
                            title={isSuspended ? "Re-activate Account" : "Suspend Account"}
                            variant={isSuspended ? "primary" : "outline"}
                            size="sm"
                            loading={actionLoadingId === u.id}
                            onPress={() => handleToggleUserStatus(u.id, u.status)}
                          />
                        </View>
                      )}
                    </Card>
                  );
                })}
              </View>
            )}

            {/* 4. DONATION MONITORING TAB */}
            {activeTab === "donations" && (
              <View style={styles.sectionGap}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeader}>Live Donation Stream</Text>
                  <Text style={styles.badgeCount}>{donations.length} Items</Text>
                </View>

                {donations.map((d) => (
                  <Card key={d.id} style={styles.itemCard} variant="elevated">
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.donationItemName}>
                          {d.quantity} {d.unit} {d.category?.name || "Donation"}
                        </Text>
                        <Text style={styles.donationDonor}>Donor: {d.donor?.name} ({d.donor?.email})</Text>
                      </View>
                      <StatusChip status={d.status} />
                    </View>

                    <Text style={styles.itemDesc}>{d.description || "No description provided."}</Text>

                    <View style={styles.donationMeta}>
                      <Text style={styles.locationText}>📍 {d.pickupAddress}</Text>
                      {d.acceptedByNgo && (
                        <Text style={styles.acceptedNgoText}>
                          🏢 Recipient: <Text style={{ fontWeight: "700" }}>{d.acceptedByNgo.name}</Text>
                        </Text>
                      )}
                      {d.receipt && (
                        <Text style={styles.receiptText}>
                          📄 Tax Receipt #{d.receipt.receiptNumber} Issued
                        </Text>
                      )}
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* 5. COMPLAINTS & GRIEVANCES TAB */}
            {activeTab === "complaints" && (
              <View style={styles.sectionGap}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeader}>Grievance Redressal</Text>
                  <Text style={styles.badgeCount}>{complaints.length} Filed</Text>
                </View>

                {complaints.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>🛡️</Text>
                    <Text style={styles.emptyTitle}>Zero Open Grievances</Text>
                    <Text style={styles.emptyDesc}>
                      There are no reported complaints or disputes on the platform.
                    </Text>
                  </Card>
                ) : (
                  complaints.map((c) => {
                    const isOpen = c.status === "OPEN";
                    return (
                      <Card key={c.id} style={styles.itemCard} variant="elevated">
                        <View style={styles.itemHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.complaintSubject}>{c.subject}</Text>
                            <Text style={Typography.caption}>
                              Filed by: {c.raisedBy?.name} ({c.raisedBy?.email})
                            </Text>
                          </View>
                          <StatusChip status={c.status} />
                        </View>

                        <Text style={styles.complaintBody}>{c.description}</Text>

                        {c.targetNgo && (
                          <Text style={Typography.caption}>Target NGO: {c.targetNgo.name}</Text>
                        )}

                        {c.resolution && (
                          <View style={styles.resolutionBox}>
                            <Text style={styles.resolutionTitle}>Resolution:</Text>
                            <Text style={styles.resolutionText}>{c.resolution}</Text>
                          </View>
                        )}

                        {isOpen && (
                          <View style={{ marginTop: Spacing.sm }}>
                            <Button
                              title="Resolve / Dismiss Grievance"
                              size="sm"
                              onPress={() => handleOpenResolveComplaint(c.id)}
                            />
                          </View>
                        )}
                      </Card>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}

        <TouchableOpacity onPress={() => router.replace("/")} style={styles.returnLink}>
          <Text style={styles.returnText}>← Back to Main Hub</Text>
        </TouchableOpacity>

        {/* Modal: Reject NGO */}
        <Modal visible={rejectModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={Typography.titleSmall}>Reject NGO Application</Text>
              <Text style={[Typography.body, { marginVertical: Spacing.xs }]}>
                Please state the reason for rejecting this organization's verification (e.g. invalid PAN, illegible 80G certificate).
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setRejectModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Confirm Rejection"
                  loading={!!actionLoadingId}
                  onPress={handleConfirmRejectNgo}
                  style={{ flex: 1, backgroundColor: Colors.accentRose }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal: Resolve Complaint */}
        <Modal visible={resolveModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={Typography.titleSmall}>Resolve Grievance</Text>
              <Text style={[Typography.body, { marginVertical: Spacing.xs }]}>
                Document the remedial action taken or justification for resolving this report.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Spoke to volunteer, delivery address corrected."
                value={resolutionText}
                onChangeText={setResolutionText}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setResolveModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Submit Resolution"
                  loading={!!actionLoadingId}
                  onPress={handleConfirmResolveComplaint}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Document Fullscreen Viewer */}
        <ImageViewerModal
          visible={viewerVisible}
          images={viewerImages}
          initialIndex={0}
          onClose={() => setViewerVisible(false)}
          title={viewerTitle}
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
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  headerRow: {
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.titleLarge,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tabScroll: {
    marginVertical: Spacing.xs,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: "#f1f5f9",
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabText: {
    ...Typography.caption,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  loadingBox: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  sectionGap: {
    gap: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeader: {
    ...Typography.titleSmall,
    fontWeight: "800",
  },
  badgeCount: {
    ...Typography.caption,
    fontWeight: "700",
    backgroundColor: "#e2e8f0",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statCol: {
    flex: 1,
    minWidth: "46%",
  },
  summaryCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  summaryTitle: {
    ...Typography.titleSmall,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#e2e8f0",
  },
  infoCard: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    gap: Spacing.xs,
  },
  infoTitle: {
    fontWeight: "700",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  itemCard: {
    gap: Spacing.sm,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ngoName: {
    ...Typography.titleSmall,
    fontWeight: "700",
  },
  ngoRegNo: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemDesc: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ownerBox: {
    backgroundColor: "#f8fafc",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 2,
  },
  ownerLabel: {
    fontWeight: "700",
    fontSize: 12,
    color: Colors.textPrimary,
  },
  ownerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  docSection: {
    gap: 4,
  },
  docTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  docRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  docBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  docBadgeText: {
    fontSize: 12,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  userName: {
    fontWeight: "700",
    fontSize: 15,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
  },
  userEmail: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  userPhone: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  miniDetail: {
    backgroundColor: "#f8fafc",
    padding: Spacing.xs,
    borderRadius: 4,
  },
  donationItemName: {
    fontWeight: "700",
    fontSize: 15,
  },
  donationDonor: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  donationMeta: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: Spacing.xs,
    gap: 2,
  },
  locationText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  acceptedNgoText: {
    ...Typography.caption,
    color: Colors.textPrimary,
  },
  receiptText: {
    fontSize: 11,
    color: "#166534",
    fontWeight: "600",
  },
  complaintSubject: {
    fontWeight: "700",
    fontSize: 15,
  },
  complaintBody: {
    ...Typography.body,
    fontSize: 13,
  },
  resolutionBox: {
    backgroundColor: "#f0fdf4",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 2,
    borderColor: "#bbf7d0",
    borderWidth: 1,
  },
  resolutionTitle: {
    fontWeight: "700",
    fontSize: 12,
    color: "#166534",
  },
  resolutionText: {
    ...Typography.caption,
    color: "#15803d",
  },
  emptyCard: {
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    ...Typography.titleSmall,
    fontWeight: "700",
  },
  emptyDesc: {
    ...Typography.body,
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 13,
  },
  returnLink: {
    alignSelf: "center",
    marginVertical: Spacing.md,
  },
  returnText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    maxWidth: 500,
    width: "100%",
    gap: Spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    ...Typography.body,
    textAlignVertical: "top",
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
