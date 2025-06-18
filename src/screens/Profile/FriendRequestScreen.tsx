import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../services/supabase";
import { FriendRequest } from "../../types";

interface FriendRequestsScreenProps {
  navigation: any;
}

export default function FriendRequestsScreen({ navigation }: FriendRequestsScreenProps) {
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get pending friend requests received by the current user
      const { data, error } = await supabase
        .from("friend_requests")
        .select(`
          *,
          requester:profiles!friend_requests_requester_id_fkey(*)
        `)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPendingRequests(data || []);
    } catch (error) {
      console.error("Error loading pending requests:", error);
      Alert.alert("Error", "Failed to load friend requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingRequests();
  };

  const acceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ 
          status: "accepted", 
          updated_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      if (error) throw error;

      // Remove from pending requests list
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
      
      Alert.alert("Friend Request Accepted", "You are now friends!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      Alert.alert("Error", "Failed to accept friend request");
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_requests")
        .update({ 
          status: "rejected", 
          updated_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      if (error) throw error;

      // Remove from pending requests list
      setPendingRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      Alert.alert("Error", "Failed to reject friend request");
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const requestTime = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - requestTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const renderRequestItem = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.userInfo}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {item.requester?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 
             item.requester?.username?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.requester?.full_name || "No name set"}</Text>
          <Text style={styles.userHandle}>@{item.requester?.username}</Text>
          <Text style={styles.timeAgo}>{formatTimeAgo(item.created_at)}</Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => acceptRequest(item.id)}
        >
          <Ionicons name="checkmark" size={20} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => rejectRequest(item.id)}
        >
          <Ionicons name="close" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading friend requests...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Friend Requests</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Friend Requests List */}
      {pendingRequests.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Pending Requests</Text>
          <Text style={styles.emptySubtitle}>
            You don't have any pending friend requests
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
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
    width: 40,
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
  requestCard: {
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
  timeAgo: {
    fontSize: 12,
    color: "#999",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#28a745",
  },
  rejectButton: {
    backgroundColor: "#dc3545",
  },
});