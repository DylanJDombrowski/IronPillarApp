import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../services/supabase";
import { UserService } from "../../services/userService";
import { Profile } from "../../types";

interface ProfileStats {
  workoutsCompleted: number;
  totalWorkoutTime: number; // in minutes
  currentStreak: number;
  friendsCount: number;
  joinedDate: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingBio, setEditingBio] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [tempBio, setTempBio] = useState("");

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const result = await UserService.getCurrentUserProfileWithStats();

      if (result.profile) {
        setProfile(result.profile);
        setFullName(result.profile.full_name || "");
        setUsername(result.profile.username || "");
        setBio(result.profile.bio || "");
        setTempBio(result.profile.bio || "");
      }

      if (result.stats) {
        setStats({
          ...result.stats,
          joinedDate: result.profile?.created_at || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData();
  }, []);

  const saveProfile = async () => {
    if (!profile) return;

    try {
      const updatedProfile = await UserService.updateProfile(profile.id, {
        full_name: fullName.trim(),
        username: username.trim(),
      });

      if (updatedProfile) {
        setProfile(updatedProfile);
      }

      setEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile";
      Alert.alert("Error", errorMessage);
    }
  };

  const saveBio = async () => {
    if (!profile) return;

    try {
      const updatedProfile = await UserService.updateProfile(profile.id, {
        bio: tempBio.trim(),
      });

      if (updatedProfile) {
        setBio(tempBio.trim());
        setProfile(updatedProfile);
      }

      setEditingBio(false);
      Alert.alert("Success", "Bio updated successfully");
    } catch (error) {
      console.error("Error updating bio:", error);
      Alert.alert("Error", "Failed to update bio");
    }
  };

  const signOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return profile?.username?.[0]?.toUpperCase() || "U";
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const formatWorkoutTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              if (editing) {
                saveProfile();
              } else {
                setEditing(true);
              }
            }}
          >
            <Ionicons
              name={editing ? "checkmark" : "pencil"}
              size={20}
              color="#007AFF"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={signOut}>
            <Ionicons name="menu" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.cameraButton}>
            <Ionicons name="camera" size={16} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          {editing ? (
            <View style={styles.editingContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#8E8E93"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.editInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor="#8E8E93"
                  autoCapitalize="none"
                />
              </View>
            </View>
          ) : (
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {profile?.full_name || "No name set"}
              </Text>
              <Text style={styles.profileUsername}>@{profile?.username}</Text>

              {/* Bio Section */}
              <TouchableOpacity
                style={styles.bioContainer}
                onPress={() => setEditingBio(true)}
              >
                {bio ? (
                  <Text style={styles.bioText}>{bio}</Text>
                ) : (
                  <Text style={styles.bioPlaceholder}>Tap to add a bio...</Text>
                )}
              </TouchableOpacity>

              {/* Join Date */}
              <View style={styles.joinDateContainer}>
                <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
                <Text style={styles.joinDateText}>
                  Joined {stats ? formatJoinDate(stats.joinedDate) : ""}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="fitness" size={24} color="#007AFF" />
            </View>
            <Text style={styles.statNumber}>
              {stats?.workoutsCompleted || 0}
            </Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={24} color="#34C759" />
            </View>
            <Text style={styles.statNumber}>
              {stats ? formatWorkoutTime(stats.totalWorkoutTime) : "0m"}
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="flame" size={24} color="#FF9500" />
            </View>
            <Text style={styles.statNumber}>{stats?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={24} color="#FF3B30" />
            </View>
            <Text style={styles.statNumber}>{stats?.friendsCount || 0}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.actionItem}>
          <View style={styles.actionIcon}>
            <Ionicons name="person-add" size={20} color="#007AFF" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Find Friends</Text>
            <Text style={styles.actionSubtitle}>
              Search and connect with other users
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <View style={styles.actionIcon}>
            <Ionicons name="notifications" size={20} color="#007AFF" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Friend Requests</Text>
            <Text style={styles.actionSubtitle}>
              Manage pending friend requests
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <View style={styles.actionIcon}>
            <Ionicons name="settings" size={20} color="#007AFF" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Settings</Text>
            <Text style={styles.actionSubtitle}>
              Privacy, notifications, and more
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        </TouchableOpacity>
      </View>

      {/* Bio Edit Modal */}
      <Modal
        visible={editingBio}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingBio(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setEditingBio(false);
                setTempBio(bio);
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Bio</Text>
            <TouchableOpacity onPress={saveBio}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.bioInput}
              value={tempBio}
              onChangeText={setTempBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={150}
              autoFocus
            />
            <Text style={styles.characterCount}>{tempBio.length}/150</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "white",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  menuButton: {
    padding: 8,
  },
  profileSection: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 36,
    fontWeight: "600",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  profileInfo: {
    width: "100%",
  },
  editingContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  profileDetails: {
    alignItems: "center",
    width: "100%",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
    textAlign: "center",
  },
  profileUsername: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 16,
  },
  bioContainer: {
    width: "100%",
    marginBottom: 16,
  },
  bioText: {
    fontSize: 16,
    color: "#1a1a1a",
    textAlign: "center",
    lineHeight: 22,
  },
  bioPlaceholder: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    fontStyle: "italic",
  },
  joinDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  joinDateText: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: 6,
  },
  statsSection: {
    backgroundColor: "white",
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
  actionsSection: {
    backgroundColor: "white",
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 100,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f3f4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  bioInput: {
    fontSize: 16,
    color: "#1a1a1a",
    textAlignVertical: "top",
    minHeight: 120,
    lineHeight: 22,
  },
  characterCount: {
    textAlign: "right",
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 12,
  },
});
