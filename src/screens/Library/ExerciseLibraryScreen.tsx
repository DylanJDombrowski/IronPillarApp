import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../../services/supabase";
import { Exercise } from "../../types";

export default function ExerciseLibraryScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const muscleGroups = ["chest", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "core"];

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchQuery, selectedMuscleGroup]);

  const loadExercises = async () => {
    try {
      const { data, error } = await supabase.from("exercises").select("*").order("name");

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error("Error loading exercises:", error);
      Alert.alert("Error", "Failed to load exercises");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterExercises = () => {
    let filtered = exercises;

    if (searchQuery) {
      filtered = filtered.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exercise.muscle_groups.some((mg) => mg.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedMuscleGroup) {
      filtered = filtered.filter((exercise) => exercise.muscle_groups.includes(selectedMuscleGroup));
    }

    setFilteredExercises(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExercises();
  };

  const renderMuscleGroupFilter = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.filterChip, selectedMuscleGroup === item && styles.filterChipActive]}
      onPress={() => setSelectedMuscleGroup(selectedMuscleGroup === item ? null : item)}
    >
      <Text style={[styles.filterChipText, selectedMuscleGroup === item && styles.filterChipTextActive]}>
        {item.charAt(0).toUpperCase() + item.slice(1)}
      </Text>
    </TouchableOpacity>
  );

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {item.description && (
        <Text style={styles.exerciseDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.exerciseDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="fitness-outline" size={16} color="#007AFF" />
          <Text style={styles.detailText}>{item.muscle_groups.join(", ")}</Text>
        </View>

        {item.equipment && (
          <View style={styles.detailRow}>
            <Ionicons name="barbell-outline" size={16} color="#007AFF" />
            <Text style={styles.detailText}>{item.equipment}</Text>
          </View>
        )}
      </View>

      <View style={styles.muscleGroupTags}>
        {item.muscle_groups.slice(0, 3).map((group, index) => (
          <View key={index} style={styles.muscleTag}>
            <Text style={styles.muscleTagText}>{group}</Text>
          </View>
        ))}
        {item.muscle_groups.length > 3 && (
          <View style={styles.muscleTag}>
            <Text style={styles.muscleTagText}>+{item.muscle_groups.length - 3}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading exercises...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exercise Library</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput style={styles.searchInput} placeholder="Search exercises..." value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Muscle Groups</Text>
        <FlatList
          horizontal
          data={muscleGroups}
          renderItem={renderMuscleGroupFilter}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredExercises.length} exercise{filteredExercises.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={filteredExercises}
        renderItem={renderExerciseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.exercisesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
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
  searchContainer: {
    padding: 20,
    backgroundColor: "white",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1a1a1a",
  },
  filtersContainer: {
    backgroundColor: "white",
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filtersList: {
    paddingHorizontal: 20,
  },
  filterChip: {
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  filterChipActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  filterChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "white",
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  exercisesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  favoriteButton: {
    padding: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  exerciseDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  muscleGroupTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  muscleTag: {
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  muscleTagText: {
    fontSize: 12,
    color: "#1976d2",
    fontWeight: "500",
  },
});
