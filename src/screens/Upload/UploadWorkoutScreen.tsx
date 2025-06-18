import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../services/supabase";

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
}

interface WorkoutType {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const workoutTypes: WorkoutType[] = [
  {
    id: "strength",
    name: "Strength Training",
    icon: "barbell",
    color: "#007AFF",
  },
  { id: "cardio", name: "Cardio", icon: "heart", color: "#FF3B30" },
  { id: "flexibility", name: "Flexibility", icon: "body", color: "#30D158" },
  { id: "sports", name: "Sports", icon: "football", color: "#FF9500" },
  {
    id: "crosstraining",
    name: "Cross Training",
    icon: "fitness",
    color: "#AF52DE",
  },
  {
    id: "other",
    name: "Other",
    icon: "ellipsis-horizontal-circle",
    color: "#8E8E93",
  },
];

export default function UploadWorkoutScreen({ navigation }: any) {
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<string>("");
  const [workoutName, setWorkoutName] = useState<string>("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addExercise = () => {
    setExercises([
      ...exercises,
      { name: "", sets: 1, reps: 1, weight: 0, notes: "" },
    ]);
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setExercises(updatedExercises);
  };

  const removeExercise = (index: number) => {
    const updatedExercises = exercises.filter((_, i) => i !== index);
    setExercises(updatedExercises);
  };

  const handleSaveWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert("Error", "Please enter a workout name");
      return;
    }

    if (!selectedWorkoutType) {
      Alert.alert("Error", "Please select a workout type");
      return;
    }

    if (exercises.length === 0) {
      Alert.alert("Error", "Please add at least one exercise");
      return;
    }

    const hasEmptyExercises = exercises.some((ex) => !ex.name.trim());
    if (hasEmptyExercises) {
      Alert.alert("Error", "Please fill in all exercise names");
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "You must be logged in to save workouts");
        return;
      }

      // Create the workout
      const { data: workout, error: workoutError } = await supabase
        .from("user_workouts")
        .insert({
          user_id: user.id,
          name: workoutName,
          type: selectedWorkoutType,
          exercises: exercises,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      Alert.alert("Success", "Workout saved successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error saving workout:", error);
      Alert.alert("Error", "Failed to save workout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderWorkoutType = ({ item }: { item: WorkoutType }) => (
    <TouchableOpacity
      style={[
        styles.workoutTypeCard,
        selectedWorkoutType === item.id && {
          borderColor: item.color,
          borderWidth: 2,
        },
      ]}
      onPress={() => setSelectedWorkoutType(item.id)}
    >
      <View style={[styles.workoutTypeIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={24} color="white" />
      </View>
      <Text style={styles.workoutTypeName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderExercise = ({
    item,
    index,
  }: {
    item: Exercise;
    index: number;
  }) => (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseNumber}>{index + 1}</Text>
        <TouchableOpacity
          onPress={() => removeExercise(index)}
          style={styles.removeButton}
        >
          <Ionicons name="close-circle" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.exerciseNameInput}
        placeholder="Exercise name"
        value={item.name}
        onChangeText={(text) => updateExercise(index, "name", text)}
      />

      <View style={styles.exerciseInputsRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Sets</Text>
          <TextInput
            style={styles.numberInput}
            value={item.sets.toString()}
            onChangeText={(text) =>
              updateExercise(index, "sets", parseInt(text) || 1)
            }
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reps</Text>
          <TextInput
            style={styles.numberInput}
            value={item.reps.toString()}
            onChangeText={(text) =>
              updateExercise(index, "reps", parseInt(text) || 1)
            }
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight (lbs)</Text>
          <TextInput
            style={styles.numberInput}
            value={item.weight.toString()}
            onChangeText={(text) =>
              updateExercise(index, "weight", parseFloat(text) || 0)
            }
            keyboardType="numeric"
          />
        </View>
      </View>

      <TextInput
        style={styles.notesInput}
        placeholder="Notes (optional)"
        value={item.notes}
        onChangeText={(text) => updateExercise(index, "notes", text)}
        multiline
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Name</Text>
          <TextInput
            style={styles.workoutNameInput}
            placeholder="Enter workout name"
            value={workoutName}
            onChangeText={setWorkoutName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Type</Text>
          <FlatList
            data={workoutTypes}
            renderItem={renderWorkoutType}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.workoutTypeRow}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.exercisesHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={addExercise}
            >
              <Ionicons name="add-circle" size={24} color="#007AFF" />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>

          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No exercises added yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap "Add Exercise" to get started
              </Text>
            </View>
          ) : (
            <FlatList
              data={exercises}
              renderItem={renderExercise}
              keyExtractor={(_, index) => index.toString()}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSaveWorkout}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.saveButtonText}>Saving...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.saveButtonText}>Save Workout</Text>
            </>
          )}
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
  scrollContainer: {
    flex: 1,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  workoutNameInput: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  workoutTypeRow: {
    justifyContent: "space-between",
  },
  workoutTypeCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    flex: 0.48,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  workoutTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  workoutTypeName: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    color: "#1a1a1a",
  },
  exercisesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addExerciseText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  exerciseCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  removeButton: {
    padding: 4,
  },
  exerciseNameInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  exerciseInputsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    marginBottom: 4,
  },
  numberInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
  },
  notesInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
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
  saveButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
