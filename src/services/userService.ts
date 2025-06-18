/**
 * User Service - Handles user profile management and synchronization
 *
 * This service ensures all authenticated users have profiles in the database
 * and provides utilities for user management operations.
 */

import { supabase } from "./supabase";
import { Profile } from "../types";

export class UserService {
  /**
   * Ensures that the current authenticated user has a profile in the database.
   * Creates one if it doesn't exist.
   */
  static async ensureCurrentUserProfile(): Promise<Profile | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.warn("No authenticated user found");
        return null;
      }

      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        console.log("✅ User profile exists:", existingProfile.username);
        return existingProfile;
      }

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking for existing profile:", checkError);
        throw checkError;
      }

      // Create new profile
      console.log("🔄 Creating new profile for user:", user.email);

      const newProfile: Partial<Profile> = {
        id: user.id,
        username: UserService.generateUsername(user.email),
        full_name:
          user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        avatar_url: user.user_metadata?.avatar_url || null,
        bio: "",
        friend_count: 0,
      };

      const { data: createdProfile, error: createError } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error("❌ Error creating profile:", createError);
        throw createError;
      }

      console.log("✅ Profile created successfully:", createdProfile.username);
      return createdProfile;
    } catch (error) {
      console.error("Error in ensureCurrentUserProfile:", error);
      throw error;
    }
  }

  /**
   * Generates a unique username from an email address
   */
  private static generateUsername(email?: string): string {
    if (!email) {
      return `user_${Date.now()}`;
    }

    const baseUsername = email.split("@")[0].toLowerCase();
    // Remove any non-alphanumeric characters except underscores
    const cleanUsername = baseUsername.replace(/[^a-zA-Z0-9_]/g, "");

    return cleanUsername || `user_${Date.now()}`;
  }

  /**
   * Checks if a username is already taken
   */
  static async isUsernameAvailable(
    username: string,
    currentUserId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("id", currentUserId || "");

      if (error) {
        console.error("Error checking username availability:", error);
        return false;
      }

      return data.length === 0;
    } catch (error) {
      console.error("Error in isUsernameAvailable:", error);
      return false;
    }
  }

  /**
   * Updates a user's profile information
   */
  static async updateProfile(
    userId: string,
    updates: Partial<
      Pick<Profile, "username" | "full_name" | "bio" | "avatar_url">
    >
  ): Promise<Profile | null> {
    try {
      // If username is being updated, check availability
      if (updates.username) {
        const isAvailable = await UserService.isUsernameAvailable(
          updates.username,
          userId
        );
        if (!isAvailable) {
          throw new Error("Username is already taken");
        }
        updates.username = updates.username.toLowerCase().trim();
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      console.log("✅ Profile updated successfully");
      return data;
    } catch (error) {
      console.error("Error in updateProfile:", error);
      throw error;
    }
  }

  /**
   * Searches for users by username or full name
   */
  static async searchUsers(
    query: string,
    currentUserId: string,
    limit: number = 50
  ): Promise<Profile[]> {
    try {
      if (query.trim().length < 2) {
        return [];
      }

      const cleanQuery = query.trim().replace(/^@/, "").toLowerCase();

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUserId)
        .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error searching users:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error in searchUsers:", error);
      throw error;
    }
  }

  /**
   * Gets a user's profile by ID
   */
  static async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error getting user profile:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error in getUserProfile:", error);
      throw error;
    }
  }

  /**
   * Bulk creates profiles for all authenticated users (admin function)
   * This should be run as a one-time migration or through a database trigger
   */
  static async syncAllAuthUsers(): Promise<{
    created: number;
    errors: number;
  }> {
    try {
      console.log("🔄 Starting bulk user sync...");

      // Note: This requires admin privileges
      const {
        data: { users },
        error: authError,
      } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error("Error listing auth users:", authError);
        throw authError;
      }

      if (!users || users.length === 0) {
        console.log("No authenticated users found");
        return { created: 0, errors: 0 };
      }

      let created = 0;
      let errors = 0;

      for (const user of users) {
        try {
          // Check if profile already exists
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .single();

          if (existingProfile) {
            console.log(`Profile already exists for: ${user.email}`);
            continue;
          }

          // Create profile
          const newProfile = {
            id: user.id,
            username: UserService.generateUsername(user.email),
            full_name:
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "User",
            avatar_url: user.user_metadata?.avatar_url || null,
            bio: "",
            friend_count: 0,
          };

          const { error: createError } = await supabase
            .from("profiles")
            .insert(newProfile);

          if (createError) {
            console.error(
              `Error creating profile for ${user.email}:`,
              createError
            );
            errors++;
          } else {
            console.log(`✅ Created profile for: ${user.email}`);
            created++;
          }
        } catch (error) {
          console.error(`Error processing user ${user.email}:`, error);
          errors++;
        }
      }

      console.log(`🎯 Sync complete: ${created} created, ${errors} errors`);
      return { created, errors };
    } catch (error) {
      console.error("Error in syncAllAuthUsers:", error);
      throw error;
    }
  }

  /**
   * Gets the current user's profile with stats
   */
  static async getCurrentUserProfileWithStats(): Promise<{
    profile: Profile | null;
    stats: {
      workoutsCompleted: number;
      totalWorkoutTime: number;
      currentStreak: number;
      friendsCount: number;
    } | null;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { profile: null, stats: null };
      }

      // Get profile
      const profile = await UserService.getUserProfile(user.id);
      if (!profile) {
        return { profile: null, stats: null };
      }

      // Get workout stats
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select("duration_minutes, completed_at")
        .eq("user_id", user.id)
        .not("completed_at", "is", null);

      // Get friends count
      const { data: friendships } = await supabase
        .from("friendships")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const workoutsCompleted = sessions?.length || 0;
      const totalWorkoutTime =
        sessions?.reduce(
          (sum, session) => sum + (session.duration_minutes || 0),
          0
        ) || 0;
      const friendsCount = friendships?.length || 0;

      // Calculate streak (simplified)
      const currentStreak = UserService.calculateWorkoutStreak(sessions || []);

      const stats = {
        workoutsCompleted,
        totalWorkoutTime,
        currentStreak,
        friendsCount,
      };

      return { profile, stats };
    } catch (error) {
      console.error("Error in getCurrentUserProfileWithStats:", error);
      return { profile: null, stats: null };
    }
  }

  /**
   * Calculates workout streak from session data
   */
  private static calculateWorkoutStreak(sessions: any[]): number {
    if (sessions.length === 0) return 0;

    // Sort sessions by date and get unique days
    const uniqueDays = [
      ...new Set(
        sessions
          .map((s) => new Date(s.completed_at).toDateString())
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      ),
    ];

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    let streak = 0;

    // Only count streak if user worked out today or yesterday
    if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
      let currentDate = new Date(uniqueDays[0]);

      for (const day of uniqueDays) {
        if (day === currentDate.toDateString()) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return streak;
  }
}
