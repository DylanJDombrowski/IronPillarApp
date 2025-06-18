import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../services/supabase";
import { SearchUser, FriendRequest } from "../../types";

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

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce search

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, currentUserId]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const searchUsers = async () => {
    if (!currentUserId || searchQuery.trim().length <= 2) return;

    setLoading(true);
    try {
      // Search users by username or full_name
      const { data: users, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUserId) // Exclude current user
        .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;

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
    } catch (error) {
      console.error("Error searching users:", error);
      Alert.alert("Error", "Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  const getFriendStatus = async (
    userId: string,
    targetUserId: string
  ): Promise<SearchUser["friend_status"]> => {
    try {
      // Check if already friends (normalize user IDs - smaller ID goes to user1_id)
      const user1_id = userId < targetUserId ? userId : targetUserId;
      const user2_id = userId < targetUserId ? targetUserId : userId;

      const { data: friendship } = await supabase
        .from("friendships")
        .select("*")
        .eq("user1_id", user1_id)
        .eq("user2_id", user2_id)
        .single();

      if (friendship) return "friends";

      // Check for pending friend requests
      const { data: sentRequest } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("requester_id", userId)
        .eq("receiver_id", targetUserId)
        .eq("status", "pending")
        .single();

      if (sentRequest) return "pending_sent";

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
          // Unique constraint violation
          Alert.alert(
            "Request Already Sent",
            "You've already sent a friend request to this user"
          );
        } else {
          throw error;
        }
        return;
      }

      // Update the user's status in the search results
      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === targetUserId
            ? { ...user, friend_status: "pending_sent" }
            : user
        )
      );

      Alert.alert("Friend Request Sent", "Your friend request has been sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const acceptFriendRequest = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      // Update the friend request status to accepted
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("requester_id", targetUserId)
        .eq("receiver_id", currentUserId)
        .eq("status", "pending");

      if (error) throw error;

      // Update the user's status in the search results
      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === targetUserId
            ? { ...user, friend_status: "friends" }
            : user
        )
      );

      Alert.alert("Friend Request Accepted", "You are now friends!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const getActionButton = (user: SearchUser) => {
    switch (user.friend_status) {
      case "friends":
        return (
          <View style={[styles.actionButton, styles.friendsButton]}>
            <Ionicons name="checkmark" size={16} color="#28a745" />
            <Text style={[styles.actionButtonText, styles.friendsText]}>
              Friends
            </Text>
          </View>
        );

      case "pending_sent":
        return (
          <View style={[styles.actionButton, styles.pendingButton]}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={[styles.actionButtonText, styles.pendingText]}>
              Sent
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
            <Text style={[styles.actionButtonText, styles.acceptText]}>
              Accept
            </Text>
          </TouchableOpacity>
        );

      default:
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.sendButton]}
            onPress={() => sendFriendRequest(user.id)}
          >
            <Ionicons name="person-add-outline" size={16} color="#007AFF" />
            <Text style={[styles.actionButtonText, styles.sendText]}>
              Add Friend
            </Text>
          </TouchableOpacity>
        );
    }
  };

  const renderUserItem = ({ item }: { item: SearchUser }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {item.full_name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase() ||
              item.username?.[0]?.toUpperCase() ||
              "U"}
          </Text>
        </View>

        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.full_name || "No name set"}</Text>
          <Text style={styles.userHandle}>@{item.username}</Text>
          <Text style={styles.friendCount}>{item.friend_count} friends</Text>
        </View>
      </View>

      {getActionButton(item)}
    </View>
  );

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
        <View style={styles.placeholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results */}
      {loading ? (
        <View style={styles.centerContainer}>
          <Text>Searching...</Text>
        </View>
      ) : searchQuery.trim().length <= 2 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Search for Users</Text>
          <Text style={styles.emptySubtitle}>
            Enter at least 3 characters to search for users by username or name
          </Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Users Found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching with a different username or name
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  placeholder: {
    width: 40, // Same width as back button for centering
  },
  searchContainer: {
    padding: 20,
    backgroundColor: "white",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1a1a1a",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
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
    color: "#666",
    textAlign: "center",
  },
  listContainer: {
    padding: 20,
  },
  userCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "white",
    fontSize: 16,
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
    color: "#666",
    marginBottom: 2,
  },
  friendCount: {
    fontSize: 12,
    color: "#999",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  sendButton: {
    backgroundColor: "#f0f8ff",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  pendingButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  acceptButton: {
    backgroundColor: "#28a745",
  },
  friendsButton: {
    backgroundColor: "#f8fff9",
    borderWidth: 1,
    borderColor: "#28a745",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sendText: {
    color: "#007AFF",
  },
  pendingText: {
    color: "#666",
  },
  acceptText: {
    color: "white",
  },
  friendsText: {
    color: "#28a745",
  },
});
