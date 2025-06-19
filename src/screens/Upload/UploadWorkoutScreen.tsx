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
  sets: ExerciseSet[];
  notes?: string;
}

interface ExerciseSet {
  setNumber: number;
  reps: number;
  weight: number;
}

interface PredefinedExercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface SelectedExercise extends Exercise {
  id: string;
  muscleGroup: string;
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

// 🔥 NEW: Predefined exercises for each workout type
const predefinedExercises: Record<
  string,
  Record<string, PredefinedExercise[]>
> = {
  upper_body: {
    Chest: [
      { id: "bench_press", name: "Bench Press", muscleGroup: "Chest" },
      {
        id: "incline_dumbbell",
        name: "Incline Dumbbell Press",
        muscleGroup: "Chest",
      },
      { id: "dumbbell_flyes", name: "Dumbbell Flyes", muscleGroup: "Chest" },
      { id: "push_ups", name: "Push-ups", muscleGroup: "Chest" },
      { id: "dips", name: "Dips", muscleGroup: "Chest" },
    ],
    Back: [
      { id: "lat_pulldowns", name: "Lat Pulldowns", muscleGroup: "Back" },
      { id: "barbell_rows", name: "Barbell Rows", muscleGroup: "Back" },
      { id: "t_bar_rows", name: "T-Bar Rows", muscleGroup: "Back" },
      { id: "pull_ups", name: "Pull-ups", muscleGroup: "Back" },
      { id: "deadlifts", name: "Deadlifts", muscleGroup: "Back" },
    ],
    Shoulders: [
      {
        id: "overhead_press",
        name: "Overhead Press",
        muscleGroup: "Shoulders",
      },
      {
        id: "lateral_raises",
        name: "Lateral Raises",
        muscleGroup: "Shoulders",
      },
      {
        id: "rear_delt_flyes",
        name: "Rear Delt Flyes",
        muscleGroup: "Shoulders",
      },
      { id: "arnold_press", name: "Arnold Press", muscleGroup: "Shoulders" },
    ],
    Arms: [
      { id: "bicep_curls", name: "Bicep Curls", muscleGroup: "Arms" },
      { id: "tricep_dips", name: "Tricep Dips", muscleGroup: "Arms" },
      { id: "hammer_curls", name: "Hammer Curls", muscleGroup: "Arms" },
      {
        id: "tricep_extensions",
        name: "Tricep Extensions",
        muscleGroup: "Arms",
      },
    ],
  },
  lower_body: {
    Quads: [
      { id: "squats", name: "Squats", muscleGroup: "Quads" },
      { id: "leg_press", name: "Leg Press", muscleGroup: "Quads" },
      { id: "lunges", name: "Lunges", muscleGroup: "Quads" },
      { id: "leg_extensions", name: "Leg Extensions", muscleGroup: "Quads" },
    ],
    Glutes: [
      { id: "hip_thrusts", name: "Hip Thrusts", muscleGroup: "Glutes" },
      {
        id: "bulgarian_split_squats",
        name: "Bulgarian Split Squats",
        muscleGroup: "Glutes",
      },
      { id: "glute_bridges", name: "Glute Bridges", muscleGroup: "Glutes" },
    ],
    Hamstrings: [
      {
        id: "romanian_deadlifts",
        name: "Romanian Deadlifts",
        muscleGroup: "Hamstrings",
      },
      { id: "leg_curls", name: "Leg Curls", muscleGroup: "Hamstrings" },
      {
        id: "stiff_leg_deadlifts",
        name: "Stiff Leg Deadlifts",
        muscleGroup: "Hamstrings",
      },
    ],
    Calves: [
      { id: "calf_raises", name: "Calf Raises", muscleGroup: "Calves" },
      {
        id: "seated_calf_raises",
        name: "Seated Calf Raises",
        muscleGroup: "Calves",
      },
    ],
  },
  cardio: {
    "High Intensity": [
      { id: "burpees", name: "Burpees", muscleGroup: "High Intensity" },
      {
        id: "mountain_climbers",
        name: "Mountain Climbers",
        muscleGroup: "High Intensity",
      },
      { id: "jump_squats", name: "Jump Squats", muscleGroup: "High Intensity" },
      { id: "high_knees", name: "High Knees", muscleGroup: "High Intensity" },
    ],
    "Low Intensity": [
      { id: "walking", name: "Walking", muscleGroup: "Low Intensity" },
      {
        id: "light_jogging",
        name: "Light Jogging",
        muscleGroup: "Low Intensity",
      },
      { id: "cycling", name: "Cycling", muscleGroup: "Low Intensity" },
      { id: "elliptical", name: "Elliptical", muscleGroup: "Low Intensity" },
    ],
  },
  other: {
    Custom: [
      { id: "custom_exercise", name: "Custom Exercise", muscleGroup: "Custom" },
    ],
  },
};

export default function UploadWorkoutScreen({ navigation }: any) {
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<string>("");
  const [workoutName, setWorkoutName] = useState<string>("");
  const [selectedExercises, setSelectedExercises] = useState<
    SelectedExercise[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const handleWorkoutTypeSelect = (typeId: string) => {
    setSelectedWorkoutType(typeId);
    setSelectedExercises([]); // Reset selected exercises when changing workout type
    setExpandedExercise(null); // Reset expanded state

    // Trigger smooth animations
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleExerciseSelect = (exercise: PredefinedExercise) => {
    // Check if exercise is already selected
    const isSelected = selectedExercises.some((ex) => ex.id === exercise.id);

    if (isSelected) {
      // If already selected, toggle expansion or remove
      if (expandedExercise === exercise.id) {
        setExpandedExercise(null);
      } else {
        setExpandedExercise(exercise.id);
      }
    } else {
      // Add new exercise with default values - start with one set
      const newExercise: SelectedExercise = {
        id: exercise.id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        sets: [{ setNumber: 1, reps: 10, weight: 0 }],
        notes: "",
      };

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedExercises([...selectedExercises, newExercise]);
      setExpandedExercise(exercise.id); // Auto-expand the newly added exercise
    }
  };

  const updateExerciseSet = (
    exerciseId: string,
    setIndex: number,
    field: keyof ExerciseSet,
    value: any
  ) => {
    const updatedExercises = selectedExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const updatedSets = [...ex.sets];
        updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };
        return { ...ex, sets: updatedSets };
      }
      return ex;
    });
    setSelectedExercises(updatedExercises);
  };

  const updateExerciseNotes = (exerciseId: string, notes: string) => {
    const updatedExercises = selectedExercises.map((ex) =>
      ex.id === exerciseId ? { ...ex, notes } : ex
    );
    setSelectedExercises(updatedExercises);
  };

  const addSetToExercise = (exerciseId: string) => {
    const updatedExercises = selectedExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const newSetNumber = ex.sets.length + 1;
        const newSet: ExerciseSet = {
          setNumber: newSetNumber,
          reps: 10,
          weight: 0,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    });

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedExercises(updatedExercises);
  };

  const removeSetFromExercise = (exerciseId: string, setIndex: number) => {
    const updatedExercises = selectedExercises.map((ex) => {
      if (ex.id === exerciseId && ex.sets.length > 1) {
        const updatedSets = ex.sets.filter((_, index) => index !== setIndex);
        // Renumber the sets
        const renumberedSets = updatedSets.map((set, index) => ({
          ...set,
          setNumber: index + 1,
        }));
        return { ...ex, sets: renumberedSets };
      }
      return ex;
    });

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedExercises(updatedExercises);
  };

  const removeExercise = (exerciseId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updatedExercises = selectedExercises.filter(
      (ex) => ex.id !== exerciseId
    );
    setSelectedExercises(updatedExercises);

    // Reset expanded state if needed
    if (expandedExercise === exerciseId) {
      setExpandedExercise(null);
    }
  };

  const toggleExerciseExpansion = (exerciseId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedExercise(expandedExercise === exerciseId ? null : exerciseId);
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

    if (selectedExercises.length === 0) {
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
          exercises: selectedExercises,
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

  // 🔥 NEW: Render muscle group sections with exercises
  const renderMuscleGroup = (
    muscleGroup: string,
    exercises: PredefinedExercise[]
  ) => {
    const selectedType = getSelectedWorkoutType();

    return (
      <View key={muscleGroup} style={styles.muscleGroupSection}>
        <Text style={[styles.muscleGroupTitle, { color: selectedType?.color }]}>
          {muscleGroup}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.exerciseStripsContainer}
        >
          {exercises.map((exercise) => {
            const isSelected = selectedExercises.some(
              (ex) => ex.id === exercise.id
            );

            return (
              <TouchableOpacity
                key={exercise.id}
                style={[
                  styles.exerciseStrip,
                  isSelected && {
                    borderColor: selectedType?.color,
                    borderWidth: 2,
                    backgroundColor: `${selectedType?.color}10`,
                  },
                ]}
                onPress={() => handleExerciseSelect(exercise)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.exerciseStripText,
                    isSelected && {
                      color: selectedType?.color,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {exercise.name}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={selectedType?.color}
                    style={styles.exerciseStripCheck}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderExercise = ({ item }: { item: SelectedExercise }) => {
    const isExpanded = expandedExercise === item.id;
    const selectedType = getSelectedWorkoutType();

    return (
      <View
        style={[styles.exerciseCard, isExpanded && styles.exerciseCardExpanded]}
      >
        <TouchableOpacity
          style={styles.exerciseHeader}
          onPress={() => toggleExerciseExpansion(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.exerciseHeaderLeft}>
            <View
              style={[
                styles.exerciseNumber,
                { backgroundColor: selectedType?.color },
              ]}
            >
              <Text style={styles.exerciseNumberText}>
                {selectedExercises.findIndex((ex) => ex.id === item.id) + 1}
              </Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.exerciseDetails}>
                {item.sets.length} set{item.sets.length !== 1 ? "s" : ""} ×{" "}
                {item.sets[0]?.reps || 0} reps
                {item.sets[0]?.weight > 0 && ` @ ${item.sets[0]?.weight}lbs`}
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
            {/* Sets Section with Add Button */}
            <View style={styles.setsHeader}>
              <Text style={styles.setsTitle}>Sets</Text>
              <TouchableOpacity
                style={[
                  styles.addSetButton,
                  { backgroundColor: selectedType?.color },
                ]}
                onPress={() => addSetToExercise(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color="white" />
              </TouchableOpacity>
            </View>

            {/* Individual Set Entries */}
            {item.sets.map((set, setIndex) => (
              <View key={setIndex} style={styles.setRow}>
                <View style={styles.setNumberContainer}>
                  <Text style={styles.setLabel}>Set</Text>
                  <View style={styles.setNumberInput}>
                    <Text style={styles.setNumberText}>{set.setNumber}</Text>
                  </View>
                </View>

                <View style={styles.setInputContainer}>
                  <Text style={styles.inputLabel}>Reps</Text>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="10"
                    keyboardType="numeric"
                    value={set.reps?.toString()}
                    onChangeText={(value) =>
                      updateExerciseSet(
                        item.id,
                        setIndex,
                        "reps",
                        parseInt(value) || 0
                      )
                    }
                  />
                </View>

                <View style={styles.setInputContainer}>
                  <Text style={styles.inputLabel}>Weight (lbs)</Text>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={set.weight?.toString()}
                    onChangeText={(value) =>
                      updateExerciseSet(
                        item.id,
                        setIndex,
                        "weight",
                        parseFloat(value) || 0
                      )
                    }
                  />
                </View>

                {/* Remove Set Button (only show if more than 1 set) */}
                {item.sets.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeSetButton}
                    onPress={() => removeSetFromExercise(item.id, setIndex)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Notes Section */}
            <View style={styles.formRow}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Rest time, form cues, etc."
                value={item.notes}
                onChangeText={(value) => updateExerciseNotes(item.id, value)}
                multiline
              />
            </View>

            {/* Remove Exercise Button */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeExercise(item.id)}
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
            <Text style={styles.sectionTitle}>Select Exercises</Text>
            {predefinedExercises[selectedWorkoutType] &&
              Object.entries(predefinedExercises[selectedWorkoutType]).map(
                ([muscleGroup, exercises]) =>
                  renderMuscleGroup(muscleGroup, exercises)
              )}
          </View>
        )}

        {/* Selected Exercises Section */}
        {selectedExercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Your Workout ({selectedExercises.length} exercise
              {selectedExercises.length !== 1 ? "s" : ""})
            </Text>
            <FlatList
              data={selectedExercises}
              renderItem={renderExercise}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Save Button */}
      {selectedWorkoutType && selectedExercises.length > 0 && (
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
                  Save Workout ({selectedExercises.length} exercise
                  {selectedExercises.length !== 1 ? "s" : ""})
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
    padding: 16,
    alignItems: "center",
    flex: 0.48,
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
    lineHeight: 14,
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
  // 🔥 NEW: Styles for muscle group sections and exercise strips
  muscleGroupSection: {
    marginBottom: 20,
  },
  muscleGroupTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    paddingLeft: 4,
  },
  exerciseStripsContainer: {
    paddingRight: 20, // Extra padding for last item
  },
  exerciseStrip: {
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  exerciseStripText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  exerciseStripCheck: {
    marginLeft: 6,
  },
  exercisesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
  // 🔥 NEW: Sets section styles
  setsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  setsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  addSetButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  setNumberContainer: {
    alignItems: "center",
    marginRight: 12,
  },
  setLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  setNumberInput: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  setInputContainer: {
    flex: 1,
    marginHorizontal: 6,
  },
  removeSetButton: {
    marginLeft: 8,
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
