import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../services/supabase";
import { ActiveSet, WorkoutWithExercises } from "../../types";

interface ActiveWorkoutScreenProps {
  navigation: any;
  route: any;
}

export default function ActiveWorkoutScreen({ navigation, route }: ActiveWorkoutScreenProps) {
  const { workout } = route.params as { workout: WorkoutWithExercises };

  const [sessionId, setSessionId] = useState<string>("");
  const [startTime] = useState(new Date());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState<ActiveSet[]>([]);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);

  const currentExercise = workout.workout_exercises[currentExerciseIndex];

  useEffect(() => {
    initializeWorkoutSession();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            setShowRestModal(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const initializeWorkoutSession = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          workout_id: workout.id,
          workout_name: workout.name,
          started_at: startTime.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setSessionId(data.id);

      // Initialize sets for the first exercise
      initializeSetsForExercise(0);
    } catch (error) {
      console.error("Error initializing workout session:", error);
      Alert.alert("Error", "Failed to start workout session");
    }
  };

  const initializeSetsForExercise = (exerciseIndex: number) => {
    const exercise = workout.workout_exercises[exerciseIndex];
    const newSets: ActiveSet[] = [];

    for (let i = 1; i <= exercise.sets; i++) {
      newSets.push({
        exercise_id: exercise.exercise_id,
        exercise_name: exercise.exercise.name,
        set_number: i,
        weight_lbs: null,
        reps: null,
        rpe: null,
        completed: false,
        target_reps: exercise.reps ?? undefined,
        rest_seconds: exercise.rest_seconds,
      });
    }

    setSets(newSets);
  };

  const updateSet = (setIndex: number, field: keyof ActiveSet, value: any) => {
    setSets((prev) => prev.map((set, index) => (index === setIndex ? { ...set, [field]: value } : set)));
  };

  const completeSet = async (setIndex: number) => {
    const set = sets[setIndex];

    if (!set.weight_lbs || !set.reps) {
      Alert.alert("Incomplete Set", "Please enter weight and reps before completing the set");
      return;
    }

    try {
      // Save set to database
      await supabase.from("workout_session_sets").insert({
        session_id: sessionId,
        exercise_id: set.exercise_id,
        exercise_name: set.exercise_name,
        set_number: set.set_number,
        weight_lbs: set.weight_lbs,
        reps: set.reps,
        rpe: set.rpe,
        completed: true,
      });

      // Mark set as completed
      updateSet(setIndex, "completed", true);

      // Start rest timer if not the last set
      const isLastSet = setIndex === sets.length - 1;
      const isLastExercise = currentExerciseIndex === workout.workout_exercises.length - 1;

      if (!isLastSet || !isLastExercise) {
        const restTime = set.rest_seconds || 60;
        setRestTimer(restTime);
        setIsResting(true);
        setShowRestModal(true);
      }
    } catch (error) {
      console.error("Error saving set:", error);
      Alert.alert("Error", "Failed to save set");
    }
  };

  const nextExercise = () => {
    if (currentExerciseIndex < workout.workout_exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      initializeSetsForExercise(nextIndex);
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = async () => {
    try {
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      await supabase
        .from("workout_sessions")
        .update({
          completed_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq("id", sessionId);

      Alert.alert("Workout Complete!", `Great job! You completed ${workout.name} in ${durationMinutes} minutes.`, [
        {
          text: "View Summary",
          onPress: () => navigation.navigate("WorkoutsList"),
        },
      ]);
    } catch (error) {
      console.error("Error finishing workout:", error);
      Alert.alert("Error", "Failed to save workout completion");
    }
  };

  const exitWorkout = () => {
    Alert.alert("Exit Workout", "Are you sure you want to exit? Your progress will be saved.", [
      { text: "Cancel", style: "cancel" },
      { text: "Exit", onPress: () => navigation.navigate("WorkoutsList") },
    ]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const allSetsCompleted = sets.every((set) => set.completed);
  const completedSets = sets.filter((set) => set.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={exitWorkout} style={styles.exitButton}>
          <Ionicons name="close" size={24} color="#ff4444" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <Text style={styles.exerciseProgress}>
            Exercise {currentExerciseIndex + 1} of {workout.workout_exercises.length}
          </Text>
        </View>

        <View style={styles.timer}>
          <Text style={styles.timerText}>{Math.floor((Date.now() - startTime.getTime()) / 60000)}m</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.exerciseSection}>
          <Text style={styles.exerciseName}>{currentExercise.exercise.name}</Text>

          {currentExercise.exercise.description && <Text style={styles.exerciseDescription}>{currentExercise.exercise.description}</Text>}

          <View style={styles.exerciseInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="fitness-outline" size={16} color="#007AFF" />
              <Text style={styles.infoText}>{currentExercise.exercise.muscle_groups?.join(", ")}</Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="barbell-outline" size={16} color="#007AFF" />
              <Text style={styles.infoText}>{currentExercise.exercise.equipment}</Text>
            </View>
          </View>
        </View>

        <View style={styles.setsSection}>
          <Text style={styles.setsTitle}>
            Sets ({completedSets}/{sets.length})
          </Text>

          {sets.map((set, index) => (
            <View key={index} style={[styles.setCard, set.completed && styles.setCardCompleted]}>
              <View style={styles.setHeader}>
                <Text style={styles.setNumber}>Set {set.set_number}</Text>
                <Text style={styles.setTarget}>Target: {set.target_reps} reps</Text>
              </View>

              <View style={styles.setInputs}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Weight (lbs)</Text>
                  <TextInput
                    style={[styles.input, set.completed && styles.inputDisabled]}
                    value={set.weight_lbs?.toString() || ""}
                    onChangeText={(text) => updateSet(index, "weight_lbs", parseFloat(text) || null)}
                    keyboardType="numeric"
                    placeholder="0"
                    editable={!set.completed}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reps</Text>
                  <TextInput
                    style={[styles.input, set.completed && styles.inputDisabled]}
                    value={set.reps?.toString() || ""}
                    onChangeText={(text) => updateSet(index, "reps", parseInt(text) || null)}
                    keyboardType="numeric"
                    placeholder="0"
                    editable={!set.completed}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>RPE</Text>
                  <TextInput
                    style={[styles.input, set.completed && styles.inputDisabled]}
                    value={set.rpe?.toString() || ""}
                    onChangeText={(text) => updateSet(index, "rpe", parseInt(text) || null)}
                    keyboardType="numeric"
                    placeholder="10"
                    editable={!set.completed}
                  />
                </View>
              </View>

              {!set.completed ? (
                <TouchableOpacity style={styles.completeButton} onPress={() => completeSet(index)}>
                  <Text style={styles.completeButtonText}>Complete Set</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        {allSetsCompleted && (
          <TouchableOpacity style={styles.nextButton} onPress={nextExercise}>
            <Text style={styles.nextButtonText}>
              {currentExerciseIndex === workout.workout_exercises.length - 1 ? "Finish Workout" : "Next Exercise"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Rest Timer Modal */}
      <Modal visible={showRestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.restModal}>
            <Text style={styles.restTitle}>Rest Time</Text>
            <Text style={styles.restTimer}>{formatTime(restTimer)}</Text>

            <View style={styles.restActions}>
              <TouchableOpacity
                style={styles.skipRestButton}
                onPress={() => {
                  setIsResting(false);
                  setShowRestModal(false);
                }}
              >
                <Text style={styles.skipRestText}>Skip Rest</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.addTimeButton} onPress={() => setRestTimer((prev) => prev + 30)}>
                <Text style={styles.addTimeText}>+30s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  exitButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  workoutName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  exerciseProgress: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  timer: {
    padding: 8,
  },
  timerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  exerciseSection: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  exerciseInfo: {
    flexDirection: "row",
    gap: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
  },
  setsSection: {
    marginBottom: 100,
  },
  setsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  setCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  setCardCompleted: {
    borderColor: "#28a745",
    backgroundColor: "#f8fff9",
  },
  setHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  setNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  setTarget: {
    fontSize: 14,
    color: "#666",
  },
  setInputs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  inputDisabled: {
    backgroundColor: "#e9ecef",
    color: "#666",
  },
  completeButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  completeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  completedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  completedText: {
    color: "#28a745",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  nextButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  restModal: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    margin: 20,
    minWidth: 280,
  },
  restTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  restTimer: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 24,
  },
  restActions: {
    flexDirection: "row",
    gap: 16,
  },
  skipRestButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  skipRestText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  addTimeButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addTimeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
