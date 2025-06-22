import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from "react-native";
import { supabase } from "../../services/supabase";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  exercises: WorkoutExerciseDisplay[];
}

interface WorkoutExerciseDisplay {
  id: string;
  name: string;
  sets: number;
  reps: number | null;
  muscle_group: string;
  workout_exercise_sets?: WorkoutExerciseSet[];
}

interface WorkoutExerciseSet {
  set_number: number;
  reps: number;
  weight: number;
}

interface HomeScreenProps {
  navigation: any;
  route: any;
}

export default function HomeScreen({ navigation, route }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<"friends" | "my_workouts">(
    "friends"
  );
  const [friendWorkouts, setFriendWorkouts] = useState<FriendWorkout[]>([]);
  const [myWorkouts, setMyWorkouts] = useState<MyWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  // CHANGED: Now using an array to track multiple expanded exercises
  const [expandedExercises, setExpandedExercises] = useState<string[]>([]);
  const [showDeleteOptions, setShowDeleteOptions] = useState<string | null>(
    null
  );

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

      // Load user's created workouts with detailed exercise information
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
            sets,
            reps,
            exercise_id,
            exercises!workout_exercises_exercise_id_fkey (
              id,
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
        workouts?.map((workout: any) => {
          const exercises: WorkoutExerciseDisplay[] =
            workout.workout_exercises?.map((we: any) => ({
              id: we.exercises?.id || we.exercise_id,
              name: we.exercises?.name || "Unknown Exercise",
              sets: we.sets,
              reps: we.reps,
              muscle_group: we.exercises?.muscle_groups?.[0] || "Unknown",
              // Use the actual reps from workout_exercises table (not mock data)
              workout_exercise_sets: Array.from(
                { length: we.sets },
                (_, index) => ({
                  set_number: index + 1,
                  reps: we.reps || 10, // This will now show the ACTUAL saved reps
                  weight: 0, // Weight data isn't saved in current structure, so default to 0
                })
              ),
            })) || [];

          return {
            id: workout.id,
            name: workout.name,
            type: workout.description?.includes("upper")
              ? "upper_body"
              : workout.description?.includes("lower")
              ? "lower_body"
              : workout.description?.includes("cardio")
              ? "cardio"
              : "other",
            completed_at: workout.created_at,
            exercises_count: workout.workout_exercises?.length || 0,
            exercises: exercises,
          };
        }) || [];

      console.log("Loaded workouts:", transformedWorkouts);
      setMyWorkouts(transformedWorkouts);
    } catch (error) {
      console.error("Error loading my workouts:", error);
      setMyWorkouts([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLike = async (workoutId: string) => {
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

  const deleteWorkout = async (workoutId: string) => {
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setShowDeleteOptions(null),
        },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user) {
                Alert.alert(
                  "Error",
                  "You must be logged in to delete workouts"
                );
                return;
              }

              // Delete workout exercises first (foreign key constraint)
              const { error: exercisesError } = await supabase
                .from("workout_exercises")
                .delete()
                .eq("workout_id", workoutId);

              if (exercisesError) throw exercisesError;

              // Delete the workout
              const { error: workoutError } = await supabase
                .from("workouts")
                .delete()
                .eq("id", workoutId)
                .eq("user_id", user.id);

              if (workoutError) throw workoutError;

              // Update local state
              setMyWorkouts((prev) =>
                prev.filter((workout) => workout.id !== workoutId)
              );
              setShowDeleteOptions(null);
              setExpandedWorkout(null);
              // CHANGED: Clear all expanded exercises when workout is deleted
              setExpandedExercises([]);

              Alert.alert("Success", "Workout deleted successfully");
            } catch (error) {
              console.error("Error deleting workout:", error);
              Alert.alert(
                "Error",
                "Failed to delete workout. Please try again."
              );
              setShowDeleteOptions(null);
            }
          },
        },
      ]
    );
  };

  const toggleWorkoutExpansion = (workoutId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedWorkout(expandedWorkout === workoutId ? null : workoutId);
    // CHANGED: Clear all expanded exercises when workout collapses
    if (expandedWorkout === workoutId) {
      setExpandedExercises([]);
    }
  };

  // CHANGED: New function to handle multiple exercise expansion
  const toggleExerciseExpansion = (exerciseKey: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedExercises((prev) => {
      if (prev.includes(exerciseKey)) {
        // Remove from expanded list if already expanded
        return prev.filter((key) => key !== exerciseKey);
      } else {
        // Add to expanded list
        return [...prev, exerciseKey];
      }
    });
  };

  const getWorkoutTypeColor = (type: string) => {
    switch (type) {
      case "upper_body":
        return "#007AFF";
      case "lower_body":
        return "#FF9500";
      case "cardio":
        return "#FF3B30";
      default:
        return "#8E8E93";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
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

  const renderMyWorkoutCard = ({ item }: { item: MyWorkout }) => {
    const isExpanded = expandedWorkout === item.id;
    const showDeleteOption = showDeleteOptions === item.id;
    const workoutTypeColor = getWorkoutTypeColor(item.type);

    return (
      <View style={styles.workoutCardContainer}>
        <View
          style={[styles.workoutCard, isExpanded && styles.workoutCardExpanded]}
        >
          {/* MAIN CLICKABLE AREA - Entire bubble except delete button */}
          <TouchableOpacity
            style={styles.mainWorkoutClickableArea}
            onPress={() => toggleWorkoutExpansion(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={styles.workoutHeaderLeft}>
                <Text style={styles.myWorkoutName}>{item.name}</Text>
              </View>
            </View>

            <View style={styles.workoutStats}>
              <View style={styles.statItem}>
                <Ionicons name="barbell-outline" size={16} color="#007AFF" />
                <Text style={styles.statText}>
                  {item.exercises_count} exercises
                </Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={16} color="#007AFF" />
                <Text style={styles.statText}>
                  {formatTimeAgo(item.completed_at)}
                </Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons
                  name="fitness-outline"
                  size={16}
                  color={workoutTypeColor}
                />
                <Text style={[styles.statText, { color: workoutTypeColor }]}>
                  {item.type.replace("_", " ").toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Delete Option */}
            {showDeleteOption && (
              <TouchableOpacity
                style={styles.deleteOption}
                onPress={() => deleteWorkout(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={16} color="#FF3B30" />
                <Text style={styles.deleteOptionText}>Delete Workout</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Exercise List - Show when expanded */}
          {isExpanded && (
            <View style={styles.exercisesList}>
              <Text style={styles.exercisesTitle}>Exercises:</Text>
              {item.exercises.map((exercise, index) => {
                const exerciseKey = `${item.id}-${exercise.id}`;
                // CHANGED: Check if this exercise is in the expanded array
                const isExerciseExpanded =
                  expandedExercises.includes(exerciseKey);

                return (
                  <View key={exerciseKey} style={styles.exerciseItem}>
                    <TouchableOpacity
                      style={styles.exerciseItemHeader}
                      onPress={() => toggleExerciseExpansion(exerciseKey)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.exerciseItemLeft}>
                        <View
                          style={[
                            styles.exerciseNumber,
                            { backgroundColor: workoutTypeColor },
                          ]}
                        >
                          <Text style={styles.exerciseNumberText}>
                            {index + 1}
                          </Text>
                        </View>
                        <View style={styles.exerciseItemInfo}>
                          <Text style={styles.exerciseItemName}>
                            {exercise.name}
                          </Text>
                          <Text style={styles.exerciseItemDetails}>
                            {exercise.sets} sets × {exercise.reps || 10} reps
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={
                          isExerciseExpanded ? "chevron-up" : "chevron-down"
                        }
                        size={16}
                        color="#666"
                      />
                    </TouchableOpacity>

                    {/* Sets Details - Show when exercise is expanded */}
                    {isExerciseExpanded && exercise.workout_exercise_sets && (
                      <View style={styles.setsContainer}>
                        <Text style={styles.setsTitle}>Sets:</Text>
                        {exercise.workout_exercise_sets.map((set, setIndex) => (
                          <View key={setIndex} style={styles.setRow}>
                            <Text style={styles.setLabel}>
                              Set {set.set_number}
                            </Text>
                            <Text style={styles.setDetails}>
                              {set.reps} reps @ {set.weight}lbs
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* DELETE BUTTON - MOVED TO TOP RIGHT */}
          <TouchableOpacity
            style={styles.deleteToggleButtonTopRight}
            onPress={() =>
              setShowDeleteOptions(showDeleteOption ? null : item.id)
            }
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
  workoutCardContainer: {
    marginBottom: 16,
  },
  workoutCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative", // Added for absolute positioning
  },
  workoutCardExpanded: {
    paddingBottom: 24,
  },
  workoutHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  mainWorkoutClickableArea: {
    flex: 1,
    paddingRight: 50, // Leave space for delete button
  },
  myWorkoutHeader: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  myWorkoutName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 12,
  },
  myWorkoutType: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  // NEW STYLE: Delete button moved to top right
  deleteToggleButtonTopRight: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  deleteOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FFE0E0",
  },
  deleteOptionText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  workoutStats: {
    flexDirection: "row",
    gap: 20,
    marginTop: 8,
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
  // Exercise List Styles
  exercisesList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  exerciseItem: {
    marginBottom: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
  },
  exerciseItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  exerciseNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  exerciseNumberText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  exerciseItemInfo: {
    flex: 1,
  },
  exerciseItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  exerciseItemDetails: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  // Sets Details Styles
  setsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  setsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  setRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 4,
  },
  setLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  setDetails: {
    fontSize: 12,
    color: "#1a1a1a",
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
