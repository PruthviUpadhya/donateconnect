import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusChip } from "../../components/StatusChip";
import { StatCard } from "../../components/StatCard";
import { Input } from "../../components/Input";
import { ImageViewerModal } from "../../components/ImageViewerModal";
import { ChatModal } from "../../components/ChatModal";
import { RatingModal } from "../../components/RatingModal";
import { Colors, Spacing, Typography, BorderRadius } from "../../theme/colors";
import { api } from "../../api/client";

export default function NgoDashboardScreen() {
  const [availableDonations, setAvailableDonations] = useState<any[]>([]);
  const [acceptedDonations, setAcceptedDonations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [beneficiaryRequests, setBeneficiaryRequests] = useState<any[]>([]);
  const [reports, setReports] = useState<any | null>(null);

  // Phase 6: Team & Notes state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"MANAGER" | "STAFF">("STAFF");
  const [addingMember, setAddingMember] = useState(false);

  // Phase 6: Chat & Rating state
  const [activeChatDonation, setActiveChatDonation] = useState<any | null>(null);
  const [activeRatingDonation, setActiveRatingDonation] = useState<any | null>(null);
  const [ratingTargetRole, setRatingTargetRole] = useState<"DONOR" | "VOLUNTEER">("DONOR");

  const [activeTab, setActiveTab] = useState<
    "AVAILABLE" | "ACCEPTED" | "INVENTORY" | "REQUESTS" | "REPORTS" | "TEAM" | "NOTES"
  >("AVAILABLE");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New Beneficiary Request Modal state
  const [newRequestModalVisible, setNewRequestModalVisible] = useState(false);
  const [reqTitle, setReqTitle] = useState("");
  const [reqCategoryId, setReqCategoryId] = useState("");
  const [reqQuantity, setReqQuantity] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [submittingReq, setSubmittingReq] = useState(false);

  // Volunteer Assignment Modal state
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningDonation, setAssigningDonation] = useState<any | null>(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Fullscreen Image Viewer Modal state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchPipeline = async () => {
    try {
      const [availRes, acceptedRes, invRes, volRes, reqRes, repRes, catRes, teamRes, notesRes] = await Promise.all([
        api.request<{ success: boolean; data: { donations: any[] } }>("/ngo/donations/available").catch(() => ({ data: { donations: [] } })),
        api.request<{ success: boolean; data: { donations: any[] } }>("/ngo/donations").catch(() => ({ data: { donations: [] } })),
        api.request<{ success: boolean; data: { inventory: any[] } }>("/ngo/inventory").catch(() => ({ data: { inventory: [] } })),
        api.request<{ success: boolean; data: { volunteers: any[] } }>("/ngo/volunteers").catch(() => ({ data: { volunteers: [] } })),
        api.request<{ success: boolean; data: { requests: any[] } }>("/ngo/requests").catch(() => ({ data: { requests: [] } })),
        api.request<{ success: boolean; data: any }>("/ngo/analytics").catch(() => 
          api.request<{ success: boolean; data: any }>("/ngo/reports").catch(() => ({ data: null }))
        ),
        api.request<{ success: boolean; data: { categories: any[] } }>("/categories").catch(() => ({ data: { categories: [] } })),
        api.request<{ success: boolean; data: { team: any[] } }>("/ngo/team").catch(() => ({ data: { team: [] } })),
        api.request<{ success: boolean; data: { notes: any[] } }>("/ngo/notes").catch(() => ({ data: { notes: [] } })),
      ]);

      setAvailableDonations(availRes.data?.donations || []);
      setAcceptedDonations(acceptedRes.data?.donations || []);
      setInventory(invRes.data?.inventory || []);
      setVolunteers(volRes.data?.volunteers || []);
      setBeneficiaryRequests(reqRes.data?.requests || []);
      setReports(repRes.data || null);
      setTeamMembers(teamRes.data?.team || []);
      setNotes(notesRes.data?.notes || []);

      if (catRes.data?.categories) {
        setCategories(catRes.data.categories);
        if (catRes.data.categories.length > 0) {
          setReqCategoryId(catRes.data.categories[0].id);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!newMemberEmail.trim()) {
      alert("Please enter a valid user email address");
      return;
    }
    try {
      setAddingMember(true);
      await api.request("/ngo/team", {
        method: "POST",
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole,
        }),
      });
      alert(`Team member added successfully as ${newMemberRole}`);
      setNewMemberEmail("");
      await fetchPipeline();
    } catch (err: any) {
      alert(err.message || "Failed to add team member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) {
      alert("Please write a note before saving");
      return;
    }
    try {
      setSavingNote(true);
      await api.request("/ngo/notes", {
        method: "POST",
        body: JSON.stringify({
          content: newNoteContent.trim(),
        }),
      });
      setNewNoteContent("");
      await fetchPipeline();
    } catch (err: any) {
      alert(err.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPipeline();
  };

  const handleAccept = async (donationId: string) => {
    try {
      setActionLoadingId(donationId);
      await api.request(`/ngo/donations/${donationId}/accept`, {
        method: "POST",
      });
      await fetchPipeline();
      setActiveTab("ACCEPTED");
    } catch (err: any) {
      alert(err.message || "Failed to accept donation. Another NGO may have already accepted it.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (donationId: string) => {
    try {
      setActionLoadingId(donationId);
      await api.request(`/ngo/donations/${donationId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: "Capacity full" }),
      });
      await fetchPipeline();
    } catch (err: any) {
      alert(err.message || "Failed to decline donation");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openAssignModal = (donation: any) => {
    setAssigningDonation(donation);
    setSelectedVolunteerId(volunteers.length > 0 ? volunteers[0].id : "");
    setAssignModalVisible(true);
  };

  const handleConfirmAssignment = async () => {
    if (!assigningDonation || !selectedVolunteerId) return;

    try {
      setAssignSubmitting(true);
      await api.request(`/ngo/donations/${assigningDonation.id}/assign`, {
        method: "POST",
        body: JSON.stringify({
          volunteerId: selectedVolunteerId,
          notes: "Please handle goods carefully",
        }),
      });

      setAssignModalVisible(false);
      setAssigningDonation(null);
      await fetchPipeline();
    } catch (err: any) {
      alert(err.message || "Failed to assign volunteer");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleCreateBeneficiaryRequest = async () => {
    if (!reqTitle || !reqQuantity || !reqCategoryId) {
      alert("Please enter title and quantity needed");
      return;
    }

    try {
      setSubmittingReq(true);
      await api.request("/ngo/requests", {
        method: "POST",
        body: JSON.stringify({
          title: reqTitle,
          categoryId: reqCategoryId,
          quantityNeeded: parseFloat(reqQuantity),
          urgency: "HIGH",
        }),
      });

      setNewRequestModalVisible(false);
      setReqTitle("");
      setReqQuantity("");
      await fetchPipeline();
    } catch (err: any) {
      alert(err.message || "Failed to create beneficiary request");
    } finally {
      setSubmittingReq(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.title}>NGO Operations Hub</Text>
            <Text style={styles.subtitle}>Triage, volunteer dispatch, inventory & requests</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "AVAILABLE" && styles.tabButtonActive]}
            onPress={() => setActiveTab("AVAILABLE")}
          >
            <Text style={[styles.tabText, activeTab === "AVAILABLE" && styles.tabTextActive]}>
              Available ({availableDonations.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "ACCEPTED" && styles.tabButtonActive]}
            onPress={() => setActiveTab("ACCEPTED")}
          >
            <Text style={[styles.tabText, activeTab === "ACCEPTED" && styles.tabTextActive]}>
              Accepted ({acceptedDonations.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "INVENTORY" && styles.tabButtonActive]}
            onPress={() => setActiveTab("INVENTORY")}
          >
            <Text style={[styles.tabText, activeTab === "INVENTORY" && styles.tabTextActive]}>
              Inventory ({inventory.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "REQUESTS" && styles.tabButtonActive]}
            onPress={() => setActiveTab("REQUESTS")}
          >
            <Text style={[styles.tabText, activeTab === "REQUESTS" && styles.tabTextActive]}>
              Needs ({beneficiaryRequests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "REPORTS" && styles.tabButtonActive]}
            onPress={() => setActiveTab("REPORTS")}
          >
            <Text style={[styles.tabText, activeTab === "REPORTS" && styles.tabTextActive]}>
              Analytics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "TEAM" && styles.tabButtonActive]}
            onPress={() => setActiveTab("TEAM")}
          >
            <Text style={[styles.tabText, activeTab === "TEAM" && styles.tabTextActive]}>
              Team ({teamMembers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === "NOTES" && styles.tabButtonActive]}
            onPress={() => setActiveTab("NOTES")}
          >
            <Text style={[styles.tabText, activeTab === "NOTES" && styles.tabTextActive]}>
              Notes ({notes.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {loading ? (
          <Text style={Typography.body}>Loading operations feed...</Text>
        ) : activeTab === "AVAILABLE" ? (
          availableDonations.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyTitle}>No Pending Donations</Text>
              <Text style={styles.emptyDesc}>
                There are no open community donations awaiting NGO pickup in your area right now.
              </Text>
            </Card>
          ) : (
            <View style={styles.list}>
              {availableDonations.map((d) => (
                <Card key={d.id} style={styles.card} variant="elevated">
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{d.category?.name || "Donation"}</Text>
                    </View>
                    <StatusChip status="PENDING" />
                  </View>

                  <Text style={styles.qtyText}>
                    {d.quantity} {d.unit}
                  </Text>
                  {d.description && <Text style={styles.descText}>{d.description}</Text>}

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
                          <Image source={{ uri: img.url }} style={styles.thumb} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.pickupText}>📍 Pickup Area: {d.pickupAddress}</Text>

                  <View style={styles.actionButtonsRow}>
                    <Button
                      title="Accept Donation"
                      size="sm"
                      loading={actionLoadingId === d.id}
                      onPress={() => handleAccept(d.id)}
                      style={{ flex: 2 }}
                    />
                    <Button
                      title="Decline"
                      size="sm"
                      variant="outline"
                      disabled={actionLoadingId === d.id}
                      onPress={() => handleReject(d.id)}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              ))}
            </View>
          )
        ) : activeTab === "ACCEPTED" ? (
          acceptedDonations.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Accepted Donations</Text>
              <Text style={styles.emptyDesc}>
                Accept incoming donations from the Available tab to organize volunteer pickups.
              </Text>
            </Card>
          ) : (
            <View style={styles.list}>
              {acceptedDonations.map((d) => (
                <Card key={d.id} style={styles.card} variant="elevated">
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{d.category?.name || "Donation"}</Text>
                    </View>
                    <StatusChip status={d.status} />
                  </View>

                  <Text style={styles.qtyText}>
                    {d.quantity} {d.unit}
                  </Text>
                  {d.description && <Text style={styles.descText}>{d.description}</Text>}

                  <View style={styles.donorInfoBox}>
                    <Text style={styles.donorName}>Donor: {d.donor?.name || "Community Donor"}</Text>
                    <Text style={styles.pickupText}>📍 {d.donor?.address || d.pickupAddress}</Text>
                    {d.donor?.phone && <Text style={styles.phoneText}>📞 {d.donor?.phone}</Text>}
                  </View>

                  {/* Collaboration Actions: Chat & Rating */}
                  <View style={styles.ngoCollabRow}>
                    <TouchableOpacity
                      style={styles.chatActionBtn}
                      activeOpacity={0.8}
                      onPress={() => setActiveChatDonation(d)}
                    >
                      <Text style={styles.chatActionBtnText}>💬 Chat</Text>
                    </TouchableOpacity>

                    {d.status === "DELIVERED" && d.donor && (
                      <TouchableOpacity
                        style={styles.rateActionBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setRatingTargetRole("DONOR");
                          setActiveRatingDonation(d);
                        }}
                      >
                        <Text style={styles.rateActionBtnText}>★ Rate Donor</Text>
                      </TouchableOpacity>
                    )}

                    {d.status === "DELIVERED" && d.assignments?.[0]?.volunteer && (
                      <TouchableOpacity
                        style={styles.rateActionBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setRatingTargetRole("VOLUNTEER");
                          setActiveRatingDonation(d);
                        }}
                      >
                        <Text style={styles.rateActionBtnText}>★ Rate Courier</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {d.assignments && d.assignments.length > 0 ? (
                    <View style={styles.assignmentInfoBox}>
                      <Text style={styles.assignedVolunteerText}>
                        🚴 Assigned Volunteer:{" "}
                        <Text style={{ fontWeight: "700" }}>
                          {d.assignments[0]?.volunteer?.user?.name || "Assigned"}
                        </Text>
                      </Text>
                      <Text style={styles.assignedStatusText}>
                        Status: {d.assignments[0]?.status}
                      </Text>
                    </View>
                  ) : (
                    <Button
                      title="Assign Volunteer →"
                      size="sm"
                      variant="outline"
                      onPress={() => openAssignModal(d)}
                    />
                  )}
                </Card>
              ))}
            </View>
          )
        ) : activeTab === "INVENTORY" ? (
          inventory.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>Inventory Empty</Text>
              <Text style={styles.emptyDesc}>
                Items delivered by volunteers are automatically added to your warehouse stock.
              </Text>
            </Card>
          ) : (
            <View style={styles.list}>
              {inventory.map((item) => (
                <Card key={item.id} style={styles.card} variant="elevated">
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.category?.name || "Goods"}</Text>
                    </View>
                    <Text style={styles.stockDateText}>
                      Received: {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.inventoryName}>{item.name}</Text>
                  <Text style={styles.inventoryQty}>
                    In Stock: <Text style={{ fontWeight: "800", color: Colors.primary }}>{item.quantity} {item.unit}</Text>
                  </Text>
                </Card>
              ))}
            </View>
          )
        ) : activeTab === "REQUESTS" ? (
          /* Beneficiary Requests & Donation Matching */
          <View style={{ gap: Spacing.md }}>
            <Button
              title="+ Post Community Need / Request"
              onPress={() => setNewRequestModalVisible(true)}
            />

            {beneficiaryRequests.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🤝</Text>
                <Text style={styles.emptyTitle}>No Active Beneficiary Needs</Text>
                <Text style={styles.emptyDesc}>
                  Post requests for relief supplies or kits needed by families in your shelter.
                </Text>
              </Card>
            ) : (
              <View style={styles.list}>
                {beneficiaryRequests.map((req) => (
                  <Card key={req.id} style={styles.card} variant="elevated">
                    <View style={styles.cardHeader}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{req.category?.name || "Needs"}</Text>
                      </View>
                      <StatusChip status={req.status} />
                    </View>
                    <Text style={styles.inventoryName}>{req.title}</Text>
                    <Text style={styles.descText}>
                      Progress: {req.quantityFulfilled} / {req.quantityNeeded} fulfilled
                    </Text>
                  </Card>
                ))}
              </View>
            )}
          </View>
        ) : activeTab === "TEAM" ? (
          /* NGO Team Management Tab */
          <View style={{ gap: Spacing.md }}>
            <Card style={styles.card} variant="elevated">
              <Text style={Typography.titleSmall}>Invite Team Member</Text>
              <Text style={[Typography.body, { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }]}>
                Add staff coordinators or managers to manage pickups and inventory.
              </Text>
              <Input
                label="Member Email"
                placeholder="colleague@domain.org"
                value={newMemberEmail}
                onChangeText={setNewMemberEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={{ flexDirection: "row", gap: 8, marginVertical: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.roleToggleBtn,
                    newMemberRole === "STAFF" && styles.roleToggleBtnActive,
                  ]}
                  onPress={() => setNewMemberRole("STAFF")}
                >
                  <Text style={[styles.roleToggleText, newMemberRole === "STAFF" && styles.roleToggleTextActive]}>
                    STAFF
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleToggleBtn,
                    newMemberRole === "MANAGER" && styles.roleToggleBtnActive,
                  ]}
                  onPress={() => setNewMemberRole("MANAGER")}
                >
                  <Text style={[styles.roleToggleText, newMemberRole === "MANAGER" && styles.roleToggleTextActive]}>
                    MANAGER
                  </Text>
                </TouchableOpacity>
              </View>
              <Button
                title="Add Member to NGO"
                size="sm"
                loading={addingMember}
                onPress={handleAddTeamMember}
              />
            </Card>

            <Text style={styles.sectionHeading}>Current Team Members ({teamMembers.length})</Text>
            {teamMembers.map((member) => (
              <Card key={member.id} style={styles.teamCard} variant="elevated">
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamMemberName}>{member.user?.name || "Staff Member"}</Text>
                    <Text style={styles.teamMemberEmail}>{member.user?.email}</Text>
                  </View>
                  <View style={styles.teamRoleBadge}>
                    <Text style={styles.teamRoleText}>{member.role}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : activeTab === "NOTES" ? (
          /* Internal Private Notes Tab */
          <View style={{ gap: Spacing.md }}>
            <Card style={styles.card} variant="elevated">
              <Text style={Typography.titleSmall}>New Private Internal Note</Text>
              <Text style={[Typography.body, { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 }]}>
                Only members of your NGO team can see these notes (audit notes, donor guidelines, shelter instructions).
              </Text>
              <Input
                label="Note Content"
                placeholder="e.g. Verified cold storage ready for upcoming dairy delivery..."
                value={newNoteContent}
                onChangeText={setNewNoteContent}
                multiline
                numberOfLines={3}
              />
              <Button
                title="Save Internal Note"
                size="sm"
                loading={savingNote}
                onPress={handleCreateNote}
                style={{ marginTop: 8 }}
              />
            </Card>

            <Text style={styles.sectionHeading}>Team Notes ({notes.length})</Text>
            {notes.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>No Notes Recorded</Text>
                <Text style={styles.emptyDesc}>Keep track of shelter requirements, donor instructions, and audit notes.</Text>
              </Card>
            ) : (
              notes.map((note) => (
                <Card key={note.id} style={styles.noteCard} variant="elevated">
                  <Text style={styles.noteContentText}>{note.content}</Text>
                  <View style={styles.noteFooter}>
                    <Text style={styles.noteAuthor}>
                      By {note.author?.name || "Team Member"} ({note.author?.role})
                    </Text>
                    <Text style={styles.noteDate}>
                      {new Date(note.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </View>
        ) : (
          /* Reports & Performance Tab */
          <View style={{ gap: Spacing.md }}>
            <View style={styles.statsGrid}>
              <View style={styles.statCol}>
                <StatCard
                  title="Accepted"
                  value={reports?.metrics?.totalAccepted || 0}
                  icon="📥"
                />
              </View>
              <View style={styles.statCol}>
                <StatCard
                  title="Delivered"
                  value={reports?.metrics?.totalDelivered || 0}
                  icon="✓"
                />
              </View>
              <View style={styles.statCol}>
                <StatCard
                  title="Stock Batches"
                  value={reports?.metrics?.activeInventoryBatches || 0}
                  icon="📦"
                />
              </View>
              <View style={styles.statCol}>
                <StatCard
                  title="Volunteers"
                  value={reports?.metrics?.activeVolunteers || 0}
                  icon="🚴"
                />
              </View>
            </View>

            <Card style={styles.card} variant="elevated">
              <Text style={Typography.titleSmall}>Impact Summary</Text>
              <Text style={[Typography.body, { fontSize: 13, color: Colors.textSecondary }]}>
                {reports?.metrics?.totalDelivered || 0} total shipments distributed to beneficiaries. Active inventory ready for rapid dispatch across community shelters.
              </Text>
            </Card>
          </View>
        )}

        <TouchableOpacity onPress={() => router.replace("/")} style={styles.returnLink}>
          <Text style={styles.returnText}>← Back to Main Hub</Text>
        </TouchableOpacity>

        {/* Assign Volunteer Modal */}
        <Modal
          visible={assignModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAssignModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Card style={styles.modalCard} variant="elevated">
              <Text style={styles.modalTitle}>Dispatch Volunteer</Text>
              <Text style={styles.modalSubtitle}>
                Select an affiliated volunteer to collect {assigningDonation?.quantity} {assigningDonation?.unit}
              </Text>

              <Text style={styles.modalLabel}>Available Volunteers:</Text>
              <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ gap: 8 }}>
                {volunteers.map((vol) => {
                  const isSelected = selectedVolunteerId === vol.id;
                  return (
                    <TouchableOpacity
                      key={vol.id}
                      onPress={() => setSelectedVolunteerId(vol.id)}
                      style={[
                        styles.volunteerOption,
                        isSelected ? styles.volunteerOptionActive : null,
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.volName, isSelected ? styles.volTextActive : null]}>
                          {vol.name}
                        </Text>
                        <Text style={[styles.volDetail, isSelected ? styles.volTextActive : null]}>
                          Vehicle: {vol.vehicleType || "Standard"} • Deliveries: {vol.tasksCompleted}
                        </Text>
                      </View>
                      {isSelected && <Text style={styles.selectedTick}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <Button
                  title="Confirm Assignment"
                  onPress={handleConfirmAssignment}
                  loading={assignSubmitting}
                  style={{ flex: 2 }}
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setAssignModalVisible(false)}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        </Modal>

        {/* Post Beneficiary Request Modal */}
        <Modal
          visible={newRequestModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNewRequestModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Card style={styles.modalCard} variant="elevated">
              <Text style={styles.modalTitle}>Post Beneficiary Need</Text>
              <Text style={styles.modalSubtitle}>
                State required goods for community distribution
              </Text>

              <Input
                label="Need Title *"
                placeholder="e.g. 50 Winter blankets for shelter"
                value={reqTitle}
                onChangeText={setReqTitle}
              />

              <Input
                label="Quantity Needed *"
                placeholder="e.g. 50"
                value={reqQuantity}
                onChangeText={setReqQuantity}
                keyboardType="numeric"
              />

              <View style={styles.modalActionsRow}>
                <Button
                  title="Publish Request"
                  onPress={handleCreateBeneficiaryRequest}
                  loading={submittingReq}
                  style={{ flex: 2 }}
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setNewRequestModalVisible(false)}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </View>
        </Modal>

        {/* Fullscreen Image Viewer Modal */}
        <ImageViewerModal
          visible={viewerVisible}
          images={viewerImages}
          initialIndex={viewerIndex}
          onClose={() => setViewerVisible(false)}
          title="Donation Photos"
        />

        {/* Phase 6: Coordination Chat Modal */}
        <ChatModal
          visible={!!activeChatDonation}
          donationId={activeChatDonation?.id || ""}
          donationTitle={activeChatDonation?.category?.name ? `${activeChatDonation.category.name} (${activeChatDonation.quantity} ${activeChatDonation.unit})` : undefined}
          onClose={() => setActiveChatDonation(null)}
        />

        {/* Phase 6: Rating Modal for Donor or Courier */}
        <RatingModal
          visible={!!activeRatingDonation}
          donationId={activeRatingDonation?.id || ""}
          targetRole={ratingTargetRole}
          targetName={
            ratingTargetRole === "DONOR"
              ? activeRatingDonation?.donor?.name
              : activeRatingDonation?.assignments?.[0]?.volunteer?.user?.name
          }
          onClose={() => setActiveRatingDonation(null)}
          onSuccess={() => fetchPipeline()}
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
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.titleLarge,
    fontSize: 24,
  },
  subtitle: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: BorderRadius.md,
    padding: 3,
    gap: 4,
  },
  tabButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    ...Typography.caption,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  statCol: {
    width: "48%",
    minWidth: 140,
    flexGrow: 1,
  },
  list: {
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    ...Typography.caption,
    color: "#4338ca",
    fontWeight: "600",
  },
  qtyText: {
    ...Typography.titleSmall,
    fontSize: 18,
  },
  descText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  imageRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginVertical: 4,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#e2e8f0",
  },
  pickupText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  donorInfoBox: {
    backgroundColor: "#f8fafc",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  donorName: {
    ...Typography.caption,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  phoneText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: "600",
  },
  assignmentInfoBox: {
    backgroundColor: "#f0fdf4",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 2,
  },
  assignedVolunteerText: {
    fontSize: 12,
    color: "#166534",
  },
  assignedStatusText: {
    fontSize: 11,
    color: "#15803d",
    fontWeight: "600",
  },
  inventoryName: {
    ...Typography.titleSmall,
    fontSize: 16,
  },
  inventoryQty: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  stockDateText: {
    fontSize: 11,
    color: Colors.textSecondary,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalTitle: {
    ...Typography.titleMedium,
    fontSize: 20,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  modalLabel: {
    ...Typography.caption,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  volunteerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  volunteerOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: "#eff6ff",
  },
  volName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  volDetail: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  volTextActive: {
    color: Colors.primary,
  },
  selectedTick: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  ngoCollabRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
  },
  chatActionBtn: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chatActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  rateActionBtn: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rateActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b45309",
  },
  roleToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  roleToggleBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "#eff6ff",
  },
  roleToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  roleToggleTextActive: {
    color: Colors.primary,
  },
  sectionHeading: {
    ...Typography.titleSmall,
    fontSize: 15,
    marginTop: 4,
  },
  teamCard: {
    padding: Spacing.sm,
  },
  teamMemberName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  teamMemberEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  teamRoleBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  teamRoleText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  noteCard: {
    padding: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: "#f8fafc",
  },
  noteContentText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
  noteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
    marginTop: 4,
  },
  noteAuthor: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  noteDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
