import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../services/supabase";
import { WorkoutExercise, WorkoutWithExercises } from "../../types";

interface WorkoutDetailScreenProps {
  navigation: any;
  route: any;
}

export default function WorkoutDetailScreen({ navigation, route }: WorkoutDetailScreenProps) {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkoutDetails();
  }, [workoutId]);

  const loadWorkoutDetails = async () => {
    try {
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
        .eq("id", workoutId)
        .single();

      if (error) throw error;

      // Sort exercises by order_index
      const workoutWithSortedExercises = {
        ...data,
        workout_exercises: data.workout_exercises.sort(
          (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
        ),
      };

      setWorkout(workoutWithSortedExercises);
    } catch (error) {
      console.error("Error loading workout details:", error);
      Alert.alert("Error", "Failed to load workout details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const startWorkout = () => {
    if (!workout) return;

    navigation.navigate("ActiveWorkout", { workout });
  };

  const renderExerciseItem = ({ item, index }: { item: WorkoutExercise & { exercise: any }; index: number }) => (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseNumber}>
          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.exercise.name}</Text>
          <Text style={styles.exerciseTarget}>
            {item.sets} sets × {item.reps ? `${item.reps} reps` : "to failure"}
          </Text>
        </View>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.exerciseDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="fitness-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.exercise.muscle_groups?.join(", ") || "Multiple"}</Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {Math.floor(item.rest_seconds / 60)}:{(item.rest_seconds % 60).toString().padStart(2, "0")} rest
          </Text>
        </View>

        {item.exercise.equipment && (
          <View style={styles.detailItem}>
            <Ionicons name="barbell-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.exercise.equipment}</Text>
          </View>
        )}
      </View>

      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading workout...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.centerContainer}>
        <Text>Workout not found</Text>
      </View>
    );
  }

  const totalSets = workout.workout_exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const estimatedTime = Math.max(30, workout.workout_exercises.length * 10);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.workoutName}>{workout.name}</Text>
          {workout.description && <Text style={styles.workoutDescription}>{workout.description}</Text>}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="barbell-outline" size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{workout.workout_exercises.length}</Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="layers-outline" size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{totalSets}</Text>
          <Text style={styles.statLabel}>Total Sets</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={24} color="#007AFF" />
          <Text style={styles.statNumber}>~{estimatedTime}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
      </View>

      <View style={styles.exercisesHeader}>
        <Text style={styles.exercisesTitle}>Exercises</Text>
      </View>

      <FlatList
        data={workout.workout_exercises}
        renderItem={renderExerciseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.exercisesList}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
          <Ionicons name="play" size={20} color="white" />
          <Text style={styles.startButtonText}>Start Workout</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: "white",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  workoutName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  workoutDescription: {
    fontSize: 16,
    color: "#666",
  },
  statsContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
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
  exercisesHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  exercisesTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  exercisesList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  exerciseCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  exerciseNumberText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  exerciseTarget: {
    fontSize: 14,
    color: "#666",
  },
  infoButton: {
    padding: 4,
  },
  exerciseDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#666",
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  startButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
