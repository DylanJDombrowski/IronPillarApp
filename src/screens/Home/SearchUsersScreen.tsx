import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../services/supabase";
import { SearchUser } from "../../types";

interface SearchUsersScreenProps {
  navigation: any;
}

export default function SearchUsersScreen({
  navigation,
}: SearchUsersScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    if (!isInitialized || !currentUserId) return;

    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce search by 500ms

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, currentUserId, isInitialized]);

  const initializeScreen = async () => {
    try {
      await getCurrentUser();
      await ensureCurrentUserProfile();
      setIsInitialized(true);
    } catch (error) {
      console.error("Error initializing search screen:", error);
      Alert.alert("Error", "Failed to initialize search. Please try again.");
    }
  };

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      console.log("✅ Current user initialized:", user.email);
    } else {
      console.error("❌ No authenticated user found");
    }
  };

  const ensureCurrentUserProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        console.log("✅ Current user profile exists");
        return;
      }

      console.log("🔄 Creating profile for current user...");

      // Create profile if it doesn't exist
      const newProfile = {
        id: user.id,
        username: user.email?.split("@")[0] || `user_${Date.now()}`,
        full_name:
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        avatar_url: null,
        friend_count: 0,
      };

      const { error: createError } = await supabase
        .from("profiles")
        .insert(newProfile);

      if (createError) {
        console.error("❌ Error creating profile:", createError);
        throw createError;
      }

      console.log("✅ Profile created successfully");
    } catch (error) {
      console.error("Error ensuring user profile:", error);
      // Don't throw - app can still function
    }
  };

  // 🔍 DEBUG FUNCTION - This will show us what's in the database
  const debugDatabase = async () => {
    try {
      console.log("🔍 DEBUG: Starting database investigation...");

      // 1. Check current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("👤 Current user:", user?.email, user?.id);

      // 2. Check ALL profiles in database
      const { data: allProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      console.log("📊 ALL profiles in database:", allProfiles);
      console.log("❌ Profiles error:", profilesError);

      // 3. Check authenticated users (if you have admin access)
      const { data: authUsers, error: authError } =
        await supabase.auth.admin.listUsers();
      console.log(
        "👥 Auth users:",
        authUsers?.users?.map((u) => ({ email: u.email, id: u.id }))
      );
      console.log("❌ Auth error:", authError);

      // 4. Show results in alert
      const profileCount = allProfiles?.length || 0;
      const authCount = authUsers?.users?.length || 0;

      Alert.alert(
        "Database Debug Results",
        `Profiles in database: ${profileCount}\n` +
          `Authenticated users: ${authCount}\n\n` +
          `Current user: ${user?.email}\n\n` +
          `Check console for detailed logs.`,
        [
          { text: "OK" },
          {
            text: "Create Test User",
            onPress: createTestUser,
          },
          {
            text: "Create Multiple Users",
            onPress: createMultipleTestUsers,
          },
        ]
      );
    } catch (error) {
      console.error("Debug error:", error);
      Alert.alert("Debug Error", "Check console for details");
    }
  };

  // 🧪 Simple UUID generator for React Native
  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  };

  // 🧪 CREATE TEST USER FUNCTION
  const createTestUser = async () => {
    try {
      console.log("🧪 Creating test user profile...");

      // Create a test profile manually with proper UUID format
      const testProfile = {
        id: generateUUID(), // Proper UUID format
        username: "testuser",
        full_name: "Test User",
        avatar_url: null,
        friend_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("profiles")
        .insert(testProfile)
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating test user:", error);
        Alert.alert("Error", `Failed to create test user: ${error.message}`);
        return;
      }

      console.log("✅ Test user created:", data);
      Alert.alert(
        "Success",
        "Test user created! Try searching for 'testuser' or 'Test User' now."
      );
    } catch (error) {
      console.error("Error creating test user:", error);
      Alert.alert("Error", "Failed to create test user");
    }
  };

  // 🧪 CREATE MULTIPLE TEST USERS
  const createMultipleTestUsers = async () => {
    try {
      console.log("🧪 Creating multiple test users...");

      const testUsers = [
        {
          id: generateUUID(),
          username: "testuser1",
          full_name: "Test User One",
          avatar_url: null,
          friend_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: generateUUID(),
          username: "johnsmith",
          full_name: "John Smith",
          avatar_url: null,
          friend_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: generateUUID(),
          username: "sarahjones",
          full_name: "Sarah Jones",
          avatar_url: null,
          friend_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const { data, error } = await supabase
        .from("profiles")
        .insert(testUsers)
        .select();

      if (error) {
        console.error("❌ Error creating test users:", error);
        Alert.alert("Error", `Failed to create test users: ${error.message}`);
        return;
      }

      console.log("✅ Test users created:", data);
      Alert.alert(
        "Success",
        `${data.length} test users created!\n\nTry searching for:\n• testuser1\n• johnsmith\n• sarahjones\n• John Smith\n• Sarah Jones`
      );
    } catch (error) {
      console.error("Error creating test users:", error);
      Alert.alert("Error", "Failed to create test users");
    }
  };

  const performSearch = async () => {
    if (!currentUserId || searchQuery.trim().length <= 2) return;

    setLoading(true);
    try {
      console.log("🔍 Searching for users with query:", searchQuery.trim());

      // Clean the search query (remove @ symbol, trim whitespace)
      const cleanQuery = searchQuery.trim().replace(/^@/, "").toLowerCase();

      // Search users by username or full_name (case insensitive)
      const { data: users, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUserId) // Exclude current user from results
        .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
        .order("created_at", { ascending: false })
        .limit(50); // Limit to 50 results for performance

      if (error) {
        console.error("❌ Search error:", error);
        throw error;
      }

      console.log(`✅ Found ${users?.length || 0} users`);

      if (!users || users.length === 0) {
        setSearchResults([]);
        return;
      }

      // Get friend status for each user
      const usersWithStatus = await Promise.all(
        users.map(async (user) => {
          const friendStatus = await getFriendStatus(currentUserId, user.id);
          return {
            ...user,
            friend_status: friendStatus,
          };
        })
      );

      setSearchResults(usersWithStatus);
      console.log(`🎯 Search completed with ${usersWithStatus.length} results`);
    } catch (error) {
      console.error("❌ Error performing search:", error);
      Alert.alert("Search Error", "Failed to search users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getFriendStatus = async (
    userId: string,
    targetUserId: string
  ): Promise<SearchUser["friend_status"]> => {
    try {
      // Normalize user IDs (smaller ID goes to user1_id for consistent lookups)
      const user1_id = userId < targetUserId ? userId : targetUserId;
      const user2_id = userId < targetUserId ? targetUserId : userId;

      // Check if already friends
      const { data: friendship } = await supabase
        .from("friendships")
        .select("*")
        .eq("user1_id", user1_id)
        .eq("user2_id", user2_id)
        .single();

      if (friendship) return "friends";

      // Check for pending friend request sent by current user
      const { data: sentRequest } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("requester_id", userId)
        .eq("receiver_id", targetUserId)
        .eq("status", "pending")
        .single();

      if (sentRequest) return "pending_sent";

      // Check for pending friend request received by current user
      const { data: receivedRequest } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("requester_id", targetUserId)
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .single();

      if (receivedRequest) return "pending_received";

      return "none";
    } catch (error) {
      console.error("Error checking friend status:", error);
      return "none";
    }
  };

  const sendFriendRequest = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase.from("friend_requests").insert({
        requester_id: currentUserId,
        receiver_id: targetUserId,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          Alert.alert(
            "Already Sent",
            "You've already sent a friend request to this user."
          );
        } else {
          throw error;
        }
        return;
      }

      // Update the user's status in search results
      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === targetUserId
            ? { ...user, friend_status: "pending_sent" }
            : user
        )
      );

      Alert.alert("Request Sent", "Friend request sent successfully!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request. Please try again.");
    }
  };

  const acceptFriendRequest = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("requester_id", targetUserId)
        .eq("receiver_id", currentUserId)
        .eq("status", "pending");

      if (error) throw error;

      // Update the user's status in search results
      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === targetUserId
            ? { ...user, friend_status: "friends" }
            : user
        )
      );

      Alert.alert("Request Accepted", "You are now friends!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert(
        "Error",
        "Failed to accept friend request. Please try again."
      );
    }
  };

  const navigateToProfile = (userId: string) => {
    // TODO: Navigate to user's profile page
    // navigation.navigate("UserProfile", { userId });
    console.log("Navigate to profile:", userId);
  };

  const getActionButton = (user: SearchUser) => {
    switch (user.friend_status) {
      case "friends":
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.friendsButton]}
            onPress={() => navigateToProfile(user.id)}
          >
            <Ionicons name="checkmark" size={16} color="#34C759" />
            <Text style={[styles.actionButtonText, styles.friendsButtonText]}>
              Friends
            </Text>
          </TouchableOpacity>
        );

      case "pending_sent":
        return (
          <View style={[styles.actionButton, styles.pendingButton]}>
            <Ionicons name="time" size={16} color="#FF9500" />
            <Text style={[styles.actionButtonText, styles.pendingButtonText]}>
              Pending
            </Text>
          </View>
        );

      case "pending_received":
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => acceptFriendRequest(user.id)}
          >
            <Ionicons name="person-add" size={16} color="white" />
            <Text style={[styles.actionButtonText, styles.acceptButtonText]}>
              Accept
            </Text>
          </TouchableOpacity>
        );

      default:
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.addButton]}
            onPress={() => sendFriendRequest(user.id)}
          >
            <Ionicons name="person-add-outline" size={16} color="#007AFF" />
            <Text style={[styles.actionButtonText, styles.addButtonText]}>
              Add Friend
            </Text>
          </TouchableOpacity>
        );
    }
  };

  const renderUserItem = ({ item }: { item: SearchUser }) => {
    const getInitials = () => {
      if (item.full_name) {
        return item.full_name
          .split(" ")
          .map((name) => name[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
      }
      return item.username?.[0]?.toUpperCase() || "U";
    };

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigateToProfile(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
          </View>

          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.full_name || "No name set"}
            </Text>
            <Text style={styles.userHandle} numberOfLines={1}>
              @{item.username}
            </Text>
            <Text style={styles.friendCount}>
              {item.friend_count || 0} friends
            </Text>
          </View>
        </View>

        {getActionButton(item)}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (searchQuery.trim().length <= 2) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Search for Users</Text>
          <Text style={styles.emptySubtitle}>
            Enter at least 3 characters to search for users by username or name
          </Text>
          <TouchableOpacity style={styles.debugButton} onPress={debugDatabase}>
            <Text style={styles.debugButtonText}>🔍 Debug Database</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Users Found</Text>
        <Text style={styles.emptySubtitle}>
          Try searching with different keywords
        </Text>
        <TouchableOpacity style={styles.debugButton} onPress={debugDatabase}>
          <Text style={styles.debugButtonText}>🔍 Debug Database</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Users</Text>
        <TouchableOpacity
          style={styles.headerDebugButton}
          onPress={debugDatabase}
        >
          <Text style={styles.headerDebugText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or name..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : searchResults.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  headerDebugButton: {
    padding: 8,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
  },
  headerDebugText: {
    fontSize: 16,
    color: "white",
  },
  searchContainer: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f3f4",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: "#1a1a1a",
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  debugButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  debugButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    padding: 20,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 2,
  },
  friendCount: {
    fontSize: 12,
    color: "#8E8E93",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  addButton: {
    backgroundColor: "transparent",
    borderColor: "#007AFF",
  },
  addButtonText: {
    color: "#007AFF",
  },
  pendingButton: {
    backgroundColor: "#FFF3CD",
    borderColor: "#FF9500",
  },
  pendingButtonText: {
    color: "#FF9500",
  },
  acceptButton: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  acceptButtonText: {
    color: "white",
  },
  friendsButton: {
    backgroundColor: "#E8F5E8",
    borderColor: "#34C759",
  },
  friendsButtonText: {
    color: "#34C759",
  },
  separator: {
    height: 12,
  },
});
