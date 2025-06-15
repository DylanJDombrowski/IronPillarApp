import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../services/supabase";
import { WorkoutWithExercises } from "../../types";

interface WorkoutsScreenProps {
  navigation: any;
}

export default function WorkoutsScreen({ navigation }: WorkoutsScreenProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      // Get workouts with their exercises and exercise details
      const { data, error } = await supabase
        .from("workouts")
        .select(
          `
          *,
          workout_exercises (
            *,
            exercise:exercises (*)
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Sort exercises within each workout by order_index
      const workoutsWithSortedExercises =
        data?.map((workout) => ({
          ...workout,
          workout_exercises: workout.workout_exercises.sort(
            (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
          ),
        })) || [];

      setWorkouts(workoutsWithSortedExercises);
    } catch (error) {
      console.error("Error loading workouts:", error);
      Alert.alert("Error", "Failed to load workouts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkouts();
  };

  const createSampleWorkouts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Create sample workouts
      const sampleWorkouts = [
        {
          name: "Push Day",
          description: "Chest, shoulders, and triceps workout",
          user_id: user.id,
          is_public: false,
        },
        {
          name: "Pull Day",
          description: "Back and biceps workout",
          user_id: user.id,
          is_public: false,
        },
        {
          name: "Leg Day",
          description: "Complete lower body workout",
          user_id: user.id,
          is_public: false,
        },
      ];

      const { data: createdWorkouts, error: workoutError } = await supabase.from("workouts").insert(sampleWorkouts).select();

      if (workoutError) throw workoutError;

      // Get some exercises to add to workouts
      const { data: exercises, error: exerciseError } = await supabase.from("exercises").select("*").limit(10);

      if (exerciseError) throw exerciseError;

      // Add exercises to workouts
      const workoutExercises = [
        // Push Day
        {
          workout_id: createdWorkouts[0].id,
          exercise_id: exercises.find((e) => e.name === "Bench Press")?.id,
          sets: 4,
          reps: 8,
          rest_seconds: 180,
          order_index: 1,
        },
        {
          workout_id: createdWorkouts[0].id,
          exercise_id: exercises.find((e) => e.name === "Incline Dumbbell Press")?.id,
          sets: 3,
          reps: 10,
          rest_seconds: 120,
          order_index: 2,
        },
        {
          workout_id: createdWorkouts[0].id,
          exercise_id: exercises.find((e) => e.name === "Overhead Press")?.id,
          sets: 3,
          reps: 8,
          rest_seconds: 120,
          order_index: 3,
        },

        // Pull Day
        {
          workout_id: createdWorkouts[1].id,
          exercise_id: exercises.find((e) => e.name === "Deadlift")?.id,
          sets: 4,
          reps: 6,
          rest_seconds: 240,
          order_index: 1,
        },
        {
          workout_id: createdWorkouts[1].id,
          exercise_id: exercises.find((e) => e.name === "Pull-ups")?.id,
          sets: 3,
          reps: 10,
          rest_seconds: 120,
          order_index: 2,
        },
        {
          workout_id: createdWorkouts[1].id,
          exercise_id: exercises.find((e) => e.name === "Bent-over Barbell Row")?.id,
          sets: 3,
          reps: 8,
          rest_seconds: 120,
          order_index: 3,
        },

        // Leg Day
        {
          workout_id: createdWorkouts[2].id,
          exercise_id: exercises.find((e) => e.name === "Squat")?.id,
          sets: 4,
          reps: 8,
          rest_seconds: 180,
          order_index: 1,
        },
        {
          workout_id: createdWorkouts[2].id,
          exercise_id: exercises.find((e) => e.name === "Romanian Deadlift")?.id,
          sets: 3,
          reps: 10,
          rest_seconds: 120,
          order_index: 2,
        },
        {
          workout_id: createdWorkouts[2].id,
          exercise_id: exercises.find((e) => e.name === "Walking Lunges")?.id,
          sets: 3,
          reps: 12,
          rest_seconds: 90,
          order_index: 3,
        },
      ].filter((we) => we.exercise_id); // Remove any that didn't find matching exercises

      await supabase.from("workout_exercises").insert(workoutExercises);

      loadWorkouts();
      Alert.alert("Success", "Sample workouts created!");
    } catch (error) {
      console.error("Error creating sample workouts:", error);
      Alert.alert("Error", "Failed to create sample workouts");
    }
  };

  const renderWorkoutCard = ({ item }: { item: WorkoutWithExercises }) => (
    <TouchableOpacity style={styles.workoutCard} onPress={() => navigation.navigate("WorkoutDetail", { workoutId: item.id })}>
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutName}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>

      {item.description && <Text style={styles.workoutDescription}>{item.description}</Text>}

      <View style={styles.workoutStats}>
        <View style={styles.statItem}>
          <Ionicons name="barbell-outline" size={16} color="#007AFF" />
          <Text style={styles.statText}>{item.workout_exercises?.length || 0} exercises</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={16} color="#007AFF" />
          <Text style={styles.statText}>~{Math.max(30, (item.workout_exercises?.length || 0) * 10)} min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading workouts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Workouts</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptySubtitle}>Create your first workout or start with our templates</Text>
          <TouchableOpacity style={styles.createButton} onPress={createSampleWorkouts}>
            <Text style={styles.createButtonText}>Create Sample Workouts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workouts}
          renderItem={renderWorkoutCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  addButton: {
    padding: 8,
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
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  workoutDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
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
  createButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
