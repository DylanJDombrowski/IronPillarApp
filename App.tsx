import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import "react-native-url-polyfill/auto";
import FriendRequestsScreen from "./src/screens/Profile/FriendRequestScreen";

// Supabase
import { Session } from "@supabase/supabase-js";
import { supabase } from "./src/services/supabase";

// Screens
import LoginScreen from "./src/screens/Auth/LoginScreen";
import SignupScreen from "./src/screens/Auth/SignupScreen";
import HomeScreen from "./src/screens/Home/HomeScreen"; // NEW: Home screen for friends' workouts
import SearchUsersScreen from "./src/screens/Home/SearchUsersScreen"; // NEW: Search users screen
import WorkoutHistoryScreen from "./src/screens/History/WorkoutHistoryScreen";
import ExerciseLibraryScreen from "./src/screens/Library/ExerciseLibraryScreen";
import MyWorkoutsScreen from "./src/screens/Workouts/WorkoutsScreen"; // NEW: Moved workout management here
import ProfileScreen from "./src/screens/Profile/ProfileScreen";
import UploadWorkoutScreen from "./src/screens/Upload/UploadWorkoutScreen";
import ActiveWorkoutScreen from "./src/screens/Workouts/ActiveWorkoutScreen";
import WorkoutDetailScreen from "./src/screens/Workouts/WorkoutDetailScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigator for Home (includes search)
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeFeed"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SearchUsers"
        component={SearchUsersScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Stack navigator for workout-related screens (now accessed through Library or other areas)
function WorkoutStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MyWorkoutsList"
        component={MyWorkoutsScreen}
        options={{ title: "My Workouts" }}
      />
      <Stack.Screen
        name="WorkoutDetail"
        component={WorkoutDetailScreen}
        options={{ title: "Workout Details" }}
      />
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

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FriendRequests"
        component={FriendRequestsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Stack navigator for the Library tab (now includes My Workouts access)
function LibraryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ExerciseLibrary"
        component={ExerciseLibraryScreen}
        options={{ title: "Exercise Library" }}
      />
      <Stack.Screen
        name="MyWorkouts"
        component={WorkoutStack}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Stack navigator for upload workflow
function UploadStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="UploadWorkout"
        component={UploadWorkoutScreen}
        options={{
          title: "Upload Workout",
          headerStyle: {
            backgroundColor: "#007AFF",
          },
          headerTintColor: "white",
          headerTitleStyle: {
            fontWeight: "bold",
          },
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

// Custom Upload Button Component
function CustomUploadButton({ onPress }: { onPress: (e: any) => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#FF3B30",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
        shadowColor: "#FF3B30",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Ionicons name="add" size={28} color="white" />
    </TouchableOpacity>
  );
}

// Main app tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          // UPDATED: Home tab instead of Workouts
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Library") {
            iconName = focused ? "library" : "library-outline";
          } else if (route.name === "Upload") {
            // This won't be used due to custom tabBarButton
            iconName = "add";
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
        tabBarShowLabel: true,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
      })}
    >
      {/* UPDATED: Home tab shows friends' workouts */}
      <Tab.Screen name="Home" component={HomeStack} />
      {/* UPDATED: Library now includes access to My Workouts */}
      <Tab.Screen name="Library" component={LibraryStack} />
      <Tab.Screen
        name="Upload"
        component={UploadStack}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CustomUploadButton
                onPress={(e) => {
                  if (props.onPress) {
                    props.onPress(e);
                  }
                }}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen name="History" component={WorkoutHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
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

  return (
    <NavigationContainer>
      {session ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
