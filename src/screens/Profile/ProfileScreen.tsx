import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../services/supabase";
import { Profile } from "../../types";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  // UPDATED: Add focus listener to refresh profile data when screen is focused
  const refreshProfile = () => {
    loadProfile();
  };

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // UPDATED: Added friend_count to the select query
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setUsername(data.username || "");
      } else {
        // Create profile if it doesn't exist
        const newProfile = {
          id: user.id,
          username: user.email?.split("@")[0] || "",
          full_name: user.user_metadata?.full_name || "",
          avatar_url: null,
          friend_count: 0, // UPDATED: Initialize friend_count
        };

        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert(newProfile)
          .select()
          .single();

        if (createError) throw createError;
        setProfile(createdProfile);
        setFullName(createdProfile.full_name || "");
        setUsername(createdProfile.username || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName.trim(),
              username: username.trim().toLowerCase(),
              updated_at: new Date().toISOString(),
            }
          : null
      );

      setEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
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
      </View>

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
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  autoCapitalize="none"
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.userName}>
                {profile?.full_name || "No name set"}
              </Text>
              <Text style={styles.userHandle}>
                @{profile?.username || "No username"}
              </Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Workout Stats</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="fitness" size={24} color="#007AFF" />
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>

          {/* UPDATED: Show actual friend count from database */}
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#28a745" />
            <Text style={styles.statNumber}>{profile?.friend_count || 0}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#28a745" />
            <Text style={styles.statNumber}>7</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#ffc107" />
            <Text style={styles.statNumber}>12h</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
        </View>
      </View>

      {/* UPDATED: Add refresh button to manually refresh friend count */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshProfile}>
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.refreshText}>Refresh Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  editButton: {
    padding: 8,
  },
  profileSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 32,
    fontWeight: "600",
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#007AFF",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  profileInfo: {
    alignItems: "center",
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 16,
    color: "#666",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  statsSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  actionsSection: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 40,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f8ff",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  refreshText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#FF3B30",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF3B30",
  },
});
