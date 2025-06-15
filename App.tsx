import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-url-polyfill/auto";

// Supabase
import { Session } from "@supabase/supabase-js";
import { supabase } from "./src/services/supabase";

// Screens
import LoginScreen from "./src/screens/Auth/LoginScreen";
import SignupScreen from "./src/screens/Auth/SignupScreen";
import WorkoutHistoryScreen from "./src/screens/History/WorkoutHistoryScreen";
import ExerciseLibraryScreen from "./src/screens/Library/ExerciseLibraryScreen";
import ProfileScreen from "./src/screens/Profile/ProfileScreen";
import ActiveWorkoutScreen from "./src/screens/Workouts/ActiveWorkoutScreen";
import WorkoutDetailScreen from "./src/screens/Workouts/WorkoutDetailScreen";
import WorkoutsScreen from "./src/screens/Workouts/WorkoutsScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigator for workout-related screens
function WorkoutStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="WorkoutsList" component={WorkoutsScreen} options={{ title: "Workouts" }} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: "Workout Details" }} />
      <Stack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{
          title: "Workout in Progress",
          headerLeft: () => null, // Prevent going back during workout
        }}
      />
    </Stack.Navigator>
  );
}

// Auth stack for login/signup
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// Main app tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Workouts") {
            iconName = focused ? "fitness" : "fitness-outline";
          } else if (route.name === "Library") {
            iconName = focused ? "library" : "library-outline";
          } else if (route.name === "History") {
            iconName = focused ? "time" : "time-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Workouts" component={WorkoutStack} />
      <Tab.Screen name="Library" component={ExerciseLibraryScreen} />
      <Tab.Screen name="History" component={WorkoutHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <NavigationContainer>{session ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}
