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

const workoutTypes: WorkoutType[] = [
  {
    id: "strength",
    name: "Strength Training",
    icon: "barbell",
    color: "#007AFF",
    description: "Build muscle and power",
  },
  {
    id: "cardio",
    name: "Cardio",
    icon: "heart",
    color: "#FF3B30",
    description: "Improve cardiovascular health",
  },
  {
    id: "flexibility",
    name: "Flexibility",
    icon: "body",
    color: "#30D158",
    description: "Increase mobility and range",
  },
  {
    id: "sports",
    name: "Sports",
    icon: "football",
    color: "#FF9500",
    description: "Sport-specific training",
  },
  {
    id: "crosstraining",
    name: "Cross Training",
    icon: "fitness",
    color: "#AF52DE",
    description: "Mixed training methods",
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

    // If exercises section wasn't visible, animate it in
    if (exercises.length === 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-add first exercise for better UX
      setTimeout(() => addExercise(), 300);
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

    const hasEmptyExercises = exercises.some((ex) => !ex.name.trim());
    if (hasEmptyExercises) {
      Alert.alert("Incomplete Exercises", "Please fill in all exercise names");
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
                { backgroundColor: selectedType?.color || "#007AFF" },
              ]}
            >
              <Text style={styles.exerciseNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseHeaderInfo}>
              <Text style={styles.exerciseHeaderTitle}>
                {item.name || `Exercise ${index + 1}`}
              </Text>
              <Text style={styles.exercisePreview}>
                {item.sets} sets × {item.reps} reps{" "}
                {item.weight > 0 && `@ ${item.weight}lbs`}
              </Text>
            </View>
          </View>

          <View style={styles.exerciseHeaderRight}>
            <TouchableOpacity
              onPress={() => removeExercise(index)}
              style={styles.removeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
            </TouchableOpacity>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#666"
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.exerciseDetails}>
            <TextInput
              style={styles.exerciseNameInput}
              placeholder="Exercise name (e.g., Bench Press, Squats)"
              value={item.name}
              onChangeText={(text) => updateExercise(index, "name", text)}
              autoFocus={!item.name}
            />

            <View style={styles.exerciseInputsRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sets</Text>
                <TextInput
                  style={styles.numberInput}
                  value={item.sets.toString()}
                  onChangeText={(text) =>
                    updateExercise(
                      index,
                      "sets",
                      Math.max(1, parseInt(text) || 1)
                    )
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
                    updateExercise(
                      index,
                      "reps",
                      Math.max(1, parseInt(text) || 1)
                    )
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
                    updateExercise(
                      index,
                      "weight",
                      Math.max(0, parseFloat(text) || 0)
                    )
                  }
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TextInput
              style={styles.notesInput}
              placeholder="Notes (optional) - e.g., 'Focus on form', 'Increase weight next time'"
              value={item.notes}
              onChangeText={(text) => updateExercise(index, "notes", text)}
              multiline
              maxLength={200}
            />
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
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Workout Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Name</Text>
          <TextInput
            style={styles.workoutNameInput}
            placeholder="Enter workout name (e.g., 'Push Day', 'Morning Run')"
            value={workoutName}
            onChangeText={setWorkoutName}
            maxLength={50}
          />
        </View>

        {/* Workout Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Workout Type</Text>
          <FlatList
            data={workoutTypes}
            renderItem={renderWorkoutType}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.workoutTypeRow}
            scrollEnabled={false}
          />
        </View>

        {/* Selected Type Confirmation */}
        {selectedWorkoutType && (
          <View style={styles.selectedTypeIndicator}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={selectedType?.color}
            />
            <Text
              style={[styles.selectedTypeText, { color: selectedType?.color }]}
            >
              {selectedType?.name} selected
            </Text>
          </View>
        )}

        {/* Exercises Section - Shows automatically after workout type selection */}
        {selectedWorkoutType && (
          <Animated.View
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
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
          </Animated.View>
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
    marginBottom: 12,
  },
  workoutTypeCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    flex: 0.48,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  workoutTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  workoutTypeName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  workoutTypeDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  selectedIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedTypeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedTypeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  addExerciseText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  exerciseCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  exerciseCardExpanded: {
    borderColor: "#007AFF",
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
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
    fontWeight: "700",
    fontSize: 14,
  },
  exerciseHeaderInfo: {
    flex: 1,
  },
  exerciseHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  exercisePreview: {
    fontSize: 14,
    color: "#666",
  },
  exerciseHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  removeButton: {
    padding: 4,
  },
  exerciseDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  exerciseNameInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  exerciseInputsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  numberInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
    fontWeight: "600",
  },
  notesInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#e9ecef",
    textAlignVertical: "top",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
