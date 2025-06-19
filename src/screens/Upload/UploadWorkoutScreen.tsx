import { Ionicons } from "@expo/vector-icons";
import React, { useState, useRef } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { supabase } from "../../services/supabase";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  description: string;
}

// 🔥 UPDATED: Changed from 6 workout types to 4 types in 2x2 layout
const workoutTypes: WorkoutType[] = [
  {
    id: "upper_body",
    name: "Upper Body",
    icon: "barbell",
    color: "#007AFF",
    description: "Arms, chest, back & shoulders",
  },
  {
    id: "lower_body",
    name: "Lower Body",
    icon: "walk",
    color: "#FF9500",
    description: "Legs, glutes & core",
  },
  {
    id: "cardio",
    name: "Cardio",
    icon: "heart",
    color: "#FF3B30",
    description: "Improve cardiovascular health",
  },
  {
    id: "other",
    name: "Other",
    icon: "ellipsis-horizontal-circle",
    color: "#8E8E93",
    description: "Custom workout type",
  },
];

export default function UploadWorkoutScreen({ navigation }: any) {
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<string>("");
  const [workoutName, setWorkoutName] = useState<string>("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const handleWorkoutTypeSelect = (typeId: string) => {
    setSelectedWorkoutType(typeId);

    // Trigger smooth animations
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Auto-add first exercise for better UX
    if (exercises.length === 0) {
      setTimeout(() => addExercise(), 200);
    }
  };

  const addExercise = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExercises = [
      ...exercises,
      { name: "", sets: 3, reps: 10, weight: 0, notes: "" },
    ];
    setExercises(newExercises);

    // Auto-expand the newly added exercise
    setExpandedExercise(newExercises.length - 1);
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setExercises(updatedExercises);
  };

  const removeExercise = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updatedExercises = exercises.filter((_, i) => i !== index);
    setExercises(updatedExercises);

    // Reset expanded state if needed
    if (expandedExercise === index) {
      setExpandedExercise(null);
    } else if (expandedExercise && expandedExercise > index) {
      setExpandedExercise(expandedExercise - 1);
    }
  };

  const toggleExerciseExpansion = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedExercise(expandedExercise === index ? null : index);
  };

  const handleSaveWorkout = async () => {
    // Validation with better UX
    if (!workoutName.trim()) {
      Alert.alert("Missing Information", "Please enter a workout name");
      return;
    }

    if (!selectedWorkoutType) {
      Alert.alert("Missing Information", "Please select a workout type");
      return;
    }

    if (exercises.length === 0) {
      Alert.alert("Missing Exercises", "Please add at least one exercise");
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

      Alert.alert("Success! 🎉", "Your workout has been saved successfully!", [
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

  const getSelectedWorkoutType = () => {
    return workoutTypes.find((type) => type.id === selectedWorkoutType);
  };

  const renderWorkoutType = ({ item }: { item: WorkoutType }) => {
    const isSelected = selectedWorkoutType === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.workoutTypeCard,
          isSelected && {
            borderColor: item.color,
            borderWidth: 2,
            backgroundColor: `${item.color}08`,
          },
        ]}
        onPress={() => handleWorkoutTypeSelect(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.workoutTypeIcon, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon as any} size={24} color="white" />
        </View>
        <Text
          style={[
            styles.workoutTypeName,
            isSelected && { color: item.color, fontWeight: "600" },
          ]}
        >
          {item.name}
        </Text>
        <Text
          style={[
            styles.workoutTypeDescription,
            isSelected && { color: item.color },
          ]}
        >
          {item.description}
        </Text>
        {isSelected && (
          <View
            style={[styles.selectedIndicator, { backgroundColor: item.color }]}
          >
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderExercise = ({
    item,
    index,
  }: {
    item: Exercise;
    index: number;
  }) => {
    const isExpanded = expandedExercise === index;
    const selectedType = getSelectedWorkoutType();

    return (
      <View
        style={[styles.exerciseCard, isExpanded && styles.exerciseCardExpanded]}
      >
        <TouchableOpacity
          style={styles.exerciseHeader}
          onPress={() => toggleExerciseExpansion(index)}
          activeOpacity={0.7}
        >
          <View style={styles.exerciseHeaderLeft}>
            <View
              style={[
                styles.exerciseNumber,
                { backgroundColor: selectedType?.color },
              ]}
            >
              <Text style={styles.exerciseNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>
                {item.name || `Exercise ${index + 1}`}
              </Text>
              <Text style={styles.exerciseDetails}>
                {item.sets} sets × {item.reps} reps
                {item.weight > 0 && ` @ ${item.weight}lbs`}
              </Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#666"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.exerciseForm}>
            <View style={styles.formRow}>
              <Text style={styles.inputLabel}>Exercise Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Push-ups, Squats"
                value={item.name}
                onChangeText={(value) => updateExercise(index, "name", value)}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.inputLabel}>Sets</Text>
                <TextInput
                  style={styles.numberInput}
                  placeholder="3"
                  keyboardType="numeric"
                  value={item.sets?.toString()}
                  onChangeText={(value) =>
                    updateExercise(index, "sets", parseInt(value) || 0)
                  }
                />
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.inputLabel}>Reps</Text>
                <TextInput
                  style={styles.numberInput}
                  placeholder="10"
                  keyboardType="numeric"
                  value={item.reps?.toString()}
                  onChangeText={(value) =>
                    updateExercise(index, "reps", parseInt(value) || 0)
                  }
                />
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.inputLabel}>Weight (lbs)</Text>
                <TextInput
                  style={styles.numberInput}
                  placeholder="0"
                  keyboardType="numeric"
                  value={item.weight?.toString()}
                  onChangeText={(value) =>
                    updateExercise(index, "weight", parseFloat(value) || 0)
                  }
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Rest time, form cues, etc."
                value={item.notes}
                onChangeText={(value) => updateExercise(index, "notes", value)}
                multiline
              />
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeExercise(index)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
              <Text style={styles.removeButtonText}>Remove Exercise</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const selectedType = getSelectedWorkoutType();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Workout Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Name</Text>
          <TextInput
            style={styles.workoutNameInput}
            placeholder="Enter workout name..."
            value={workoutName}
            onChangeText={setWorkoutName}
          />
        </View>

        {/* Workout Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Workout Type</Text>
          {/* 🔥 UPDATED: Changed numColumns from 3 to 2 for 2x2 grid */}
          <FlatList
            data={workoutTypes}
            renderItem={renderWorkoutType}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.workoutTypeRow}
            scrollEnabled={false}
          />
        </View>

        {/* Exercises Section - Always visible when workout type is selected */}
        {selectedWorkoutType && (
          <View style={styles.section}>
            <View style={styles.exercisesHeader}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              <TouchableOpacity
                style={[
                  styles.addExerciseButton,
                  { backgroundColor: selectedType?.color },
                ]}
                onPress={addExercise}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addExerciseText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>

            {exercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="fitness-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  Ready to add exercises!
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap "Add Exercise" to start building your{" "}
                  {selectedType?.name.toLowerCase()} workout
                </Text>
              </View>
            ) : (
              <FlatList
                data={exercises}
                renderItem={renderExercise}
                keyExtractor={(_, index) => index.toString()}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Save Button */}
      {selectedWorkoutType && exercises.length > 0 && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: selectedType?.color },
              isLoading && styles.saveButtonDisabled,
            ]}
            onPress={handleSaveWorkout}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <Text style={styles.saveButtonText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.saveButtonText}>
                  Save Workout ({exercises.length} exercise
                  {exercises.length !== 1 ? "s" : ""})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  workoutNameInput: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutTypeRow: {
    justifyContent: "space-between",
    marginBottom: 8,
  },
  workoutTypeCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16, // 🔥 UPDATED: Increased padding from 12 to 16 for better spacing in 2x2 grid
    alignItems: "center",
    flex: 0.48, // 🔥 UPDATED: Changed from 0.31 to 0.48 for 2-column layout (48% each with gap)
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    position: "relative",
  },
  workoutTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  workoutTypeName: {
    fontSize: 14, // 🔥 UPDATED: Increased from 12 to 14 for better readability in larger cards
    fontWeight: "600",
    textAlign: "center",
    color: "#1a1a1a",
    marginBottom: 4, // 🔥 UPDATED: Increased from 2 to 4 for better spacing
  },
  workoutTypeDescription: {
    fontSize: 12, // 🔥 UPDATED: Increased from 10 to 12 for better readability
    color: "#666",
    textAlign: "center",
    lineHeight: 14, // 🔥 UPDATED: Adjusted line height
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  exercisesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addExerciseText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  exerciseCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  exerciseCardExpanded: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  exerciseNumberText: {
    color: "white",
    fontSize: 14,
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
  exerciseDetails: {
    fontSize: 14,
    color: "#666",
  },
  exerciseForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  formRow: {
    marginBottom: 16,
  },
  formColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  numberInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    textAlign: "center",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginTop: 8,
  },
  removeButtonText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
