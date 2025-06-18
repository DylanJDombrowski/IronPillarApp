import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../services/supabase";
import { WorkoutWithExercises } from "../../types";

interface MyWorkoutsScreenProps {
  navigation: any;
}

export default function MyWorkoutsScreen({
  navigation,
}: MyWorkoutsScreenProps) {
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
            (a: { order_index: number }, b: { order_index: number }) =>
              a.order_index - b.order_index
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
      // This is the same sample workout creation logic from the original WorkoutsScreen
      // Implementation would go here...
      Alert.alert("Info", "Sample workout creation not implemented yet");
    } catch (error) {
      console.error("Error creating sample workouts:", error);
      Alert.alert("Error", "Failed to create sample workouts");
    }
  };

  const renderWorkoutCard = ({ item }: { item: WorkoutWithExercises }) => (
    <TouchableOpacity
      style={styles.workoutCard}
      onPress={() =>
        navigation.navigate("WorkoutDetail", { workoutId: item.id })
      }
    >
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutName}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>

      {item.description && (
        <Text style={styles.workoutDescription}>{item.description}</Text>
      )}

      <View style={styles.workoutStats}>
        <View style={styles.statItem}>
          <Ionicons name="barbell-outline" size={16} color="#007AFF" />
          <Text style={styles.statText}>
            {item.workout_exercises?.length || 0} exercises
          </Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={16} color="#007AFF" />
          <Text style={styles.statText}>
            ~{Math.max(30, (item.workout_exercises?.length || 0) * 10)} min
          </Text>
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
          <Text style={styles.emptySubtitle}>
            Create your first workout or start with our templates
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={createSampleWorkouts}
          >
            <Text style={styles.createButtonText}>Create Sample Workouts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workouts}
          renderItem={renderWorkoutCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
