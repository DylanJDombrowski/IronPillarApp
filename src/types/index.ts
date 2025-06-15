// Database types based on our Supabase schema

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscle_groups: string[];
  equipment: string | null;
  instructions: string[];
  created_at: string;
}

export interface Workout {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sets: number;
  reps: number | null;
  rest_seconds: number;
  order_index: number;
  notes: string | null;
  exercise?: Exercise; // Joined exercise data
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_id: string | null;
  workout_name: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
}

export interface WorkoutSessionSet {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight_lbs: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  created_at: string;
}

// UI/App specific types

export interface WorkoutWithExercises extends Workout {
  workout_exercises: (WorkoutExercise & { exercise: Exercise })[];
}

export interface ActiveSet {
  id?: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight_lbs: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  target_reps?: number;
  rest_seconds?: number;
}

export interface ActiveWorkout {
  session_id: string;
  workout_name: string;
  started_at: string;
  current_exercise_index: number;
  exercises: (WorkoutExercise & { exercise: Exercise })[];
  sets: ActiveSet[];
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  Workouts: undefined;
  Library: undefined;
  History: undefined;
  Profile: undefined;
};

export type WorkoutStackParamList = {
  WorkoutsList: undefined;
  WorkoutDetail: { workoutId: string };
  ActiveWorkout: { workout: WorkoutWithExercises };
};
