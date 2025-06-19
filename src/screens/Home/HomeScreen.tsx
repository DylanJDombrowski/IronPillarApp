import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../services/supabase";

interface FriendWorkout {
  id: string;
  user_name: string;
  user_username: string;
  workout_name: string;
  completed_at: string;
  exercises_count: number;
  duration_minutes: number;
  likes_count: number;
  user_liked: boolean;
}

interface MyWorkout {
  id: string;
  name: string;
  type: string;
  completed_at: string;
  exercises_count: number;
  duration_minutes: number;
}

interface HomeScreenProps {
  navigation: any;
  route: any; // Added for navigation params
}

export default function HomeScreen({ navigation, route }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<"friends" | "my_workouts">(
    "friends"
  );
  const [friendWorkouts, setFriendWorkouts] = useState<FriendWorkout[]>([]);
  const [myWorkouts, setMyWorkouts] = useState<MyWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Handle navigation parameters to switch tabs
  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveTab(route.params.activeTab);
    }
  }, [route.params]);

  const loadData = async () => {
    try {
      await Promise.all([loadFriendWorkouts(), loadMyWorkouts()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFriendWorkouts = async () => {
    try {
      // TODO: This will be implemented when we add the friends system
      // For now, we'll show some placeholder data
      const mockData: FriendWorkout[] = [
        {
          id: "1",
          user_name: "John Doe",
          user_username: "johndoe",
          workout_name: "Upper Body Strength",
          completed_at: "2025-06-18T10:30:00Z",
          exercises_count: 5,
          duration_minutes: 45,
          likes_count: 3,
          user_liked: false,
        },
        {
          id: "2",
          user_name: "Sarah Wilson",
          user_username: "sarahw",
          workout_name: "Morning Cardio",
          completed_at: "2025-06-18T07:15:00Z",
          exercises_count: 3,
          duration_minutes: 30,
          likes_count: 7,
          user_liked: true,
        },
      ];

      setFriendWorkouts(mockData);
    } catch (error) {
      console.error("Error loading friend workouts:", error);
    }
  };

  const loadMyWorkouts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("No user found");
        setMyWorkouts([]);
        return;
      }

      // Load user's created workouts from the workouts table
      const { data: workouts, error } = await supabase
        .from("workouts")
        .select(
          `
          id,
          name,
          description,
          created_at,
          workout_exercises (
            id,
            exercise:exercises (
              name,
              muscle_groups
            )
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading workouts:", error);
        throw error;
      }

      // Transform the data to match the MyWorkout interface
      const transformedWorkouts: MyWorkout[] =
        workouts?.map((workout) => ({
          id: workout.id,
          name: workout.name,
          type: workout.description?.includes("upper")
            ? "upper_body"
            : workout.description?.includes("lower")
            ? "lower_body"
            : workout.description?.includes("cardio")
            ? "cardio"
            : "other",
          completed_at: workout.created_at, // Using created_at since these are saved workouts, not completed ones
          exercises_count: workout.workout_exercises?.length || 0,
          duration_minutes: Math.max(
            30,
            (workout.workout_exercises?.length || 0) * 10
          ), // Estimated duration
        })) || [];

      console.log("Loaded workouts:", transformedWorkouts);
      setMyWorkouts(transformedWorkouts);
    } catch (error) {
      console.error("Error loading my workouts:", error);
      setMyWorkouts([]); // Set empty array on error
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLike = async (workoutId: string) => {
    // TODO: Implement like functionality
    setFriendWorkouts((prev) =>
      prev.map((workout) =>
        workout.id === workoutId
          ? {
              ...workout,
              user_liked: !workout.user_liked,
              likes_count: workout.user_liked
                ? workout.likes_count - 1
                : workout.likes_count + 1,
            }
          : workout
      )
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const renderFriendWorkoutCard = ({ item }: { item: FriendWorkout }) => (
    <View style={styles.workoutCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.user_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.user_name}</Text>
            <Text style={styles.userHandle}>@{item.user_username}</Text>
          </View>
        </View>
        <Text style={styles.timeAgo}>{formatTimeAgo(item.completed_at)}</Text>
      </View>

      <View style={styles.workoutContent}>
        <Text style={styles.workoutTitle}>{item.workout_name}</Text>
        <View style={styles.workoutStats}>
          <View style={styles.statItem}>
            <Ionicons name="barbell-outline" size={16} color="#007AFF" />
            <Text style={styles.statText}>
              {item.exercises_count} exercises
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#007AFF" />
            <Text style={styles.statText}>{item.duration_minutes} min</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, item.user_liked && styles.likedButton]}
          onPress={() => handleLike(item.id)}
        >
          <Ionicons
            name={item.user_liked ? "heart" : "heart-outline"}
            size={20}
            color={item.user_liked ? "#FF3B30" : "#666"}
          />
          <Text
            style={[styles.actionText, item.user_liked && styles.likedText]}
          >
            {item.likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color="#666" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMyWorkoutCard = ({ item }: { item: MyWorkout }) => (
    <View style={styles.workoutCard}>
      <View style={styles.myWorkoutHeader}>
        <Text style={styles.myWorkoutName}>{item.name}</Text>
        <Text style={styles.myWorkoutType}>
          {item.type.replace("_", " ").toUpperCase()}
        </Text>
      </View>

      <View style={styles.workoutStats}>
        <View style={styles.statItem}>
          <Ionicons name="barbell-outline" size={16} color="#007AFF" />
          <Text style={styles.statText}>{item.exercises_count} exercises</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={16} color="#007AFF" />
          <Text style={styles.statText}>{item.duration_minutes} min</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={16} color="#007AFF" />
          <Text style={styles.statText}>
            {formatTimeAgo(item.completed_at)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderFriendsEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No friend workouts yet</Text>
      <Text style={styles.emptySubtitle}>
        Add friends to see their workout activity here!
      </Text>
      <TouchableOpacity
        style={styles.findFriendsButton}
        onPress={() => navigation.navigate("SearchUsers")}
      >
        <Text style={styles.findFriendsText}>Find Friends</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMyWorkoutsEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="barbell-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No saved workouts</Text>
      <Text style={styles.emptySubtitle}>
        Create your first workout to see it here!
      </Text>
      <TouchableOpacity
        style={styles.findFriendsButton}
        onPress={() => navigation.navigate("Upload")}
      >
        <Text style={styles.findFriendsText}>Create Workout</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Search */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate("SearchUsers")}
        >
          <Ionicons name="search" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "friends" && styles.activeTab]}
          onPress={() => setActiveTab("friends")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "friends" && styles.activeTabText,
            ]}
          >
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "my_workouts" && styles.activeTab]}
          onPress={() => setActiveTab("my_workouts")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "my_workouts" && styles.activeTabText,
            ]}
          >
            My Workouts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === "friends" ? (
        friendWorkouts.length === 0 ? (
          renderFriendsEmptyState()
        ) : (
          <FlatList
            data={friendWorkouts}
            renderItem={renderFriendWorkoutCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )
      ) : myWorkouts.length === 0 ? (
        renderMyWorkoutsEmptyState()
      ) : (
        <FlatList
          data={myWorkouts}
          renderItem={renderMyWorkoutCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
  searchButton: {
    padding: 8,
  },
  // Tab styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "#007AFF",
  },
  listContainer: {
    padding: 20,
  },
  workoutCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  userHandle: {
    fontSize: 14,
    color: "#666",
  },
  timeAgo: {
    fontSize: 14,
    color: "#666",
  },
  workoutContent: {
    marginBottom: 16,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  // My Workouts specific styles
  myWorkoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  myWorkoutName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  myWorkoutType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  workoutStats: {
    flexDirection: "row",
    gap: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: "#666",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  likedButton: {
    // No additional styling needed, color handled by icon and text
  },
  actionText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  likedText: {
    color: "#FF3B30",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  findFriendsButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  findFriendsText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
