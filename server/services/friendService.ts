import { User, Connection } from "@shared/schema";
import { storage } from "../storage";
import { notifyAboutNewPoem } from "./notificationService";

/**
 * Send a friend request
 * @param userId The user sending the request
 * @param friendUsername The username of the friend to add
 * @returns Result object with success flag and connection or error message
 */
export async function sendFriendRequest(
  userId: number, 
  friendUsername: string
): Promise<{ success: boolean; connection?: Connection; error?: string }> {
  try {
    // Check if friend exists
    const friend = await storage.getUserByUsername(friendUsername);
    if (!friend) {
      return { success: false, error: "User not found" };
    }
    
    // Don't allow self-friending
    if (friend.id === userId) {
      return { success: false, error: "You cannot add yourself as a friend" };
    }
    
    // Check if a connection already exists
    const existingConnection = await storage.getConnection(userId, friend.id);
    if (existingConnection) {
      if (existingConnection.status === "accepted") {
        return { success: false, error: "You are already friends with this user" };
      } else if (existingConnection.status === "pending") {
        return { success: false, error: "A friend request is already pending" };
      }
    }
    
    // Create the connection
    const connection = await storage.createConnection({
      requesterId: userId,
      recipientId: friend.id,
      status: "pending"
    });
    
    return { success: true, connection };
  } catch (error) {
    console.error("Error sending friend request:", error);
    return { success: false, error: "An error occurred while sending the friend request" };
  }
}

/**
 * Accept a friend request
 * @param userId The user accepting the request
 * @param connectionId The ID of the connection to accept
 * @returns Result object with success flag and connection or error message
 */
export async function acceptFriendRequest(
  userId: number, 
  connectionId: number
): Promise<{ success: boolean; connection?: Connection; error?: string }> {
  try {
    // Get the connection
    const connection = await storage.getUserConnectionById(connectionId);
    if (!connection) {
      return { success: false, error: "Connection not found" };
    }
    
    // Ensure the user is the recipient
    if (connection.recipientId !== userId) {
      return { success: false, error: "You cannot accept this request" };
    }
    
    // Ensure the connection is pending
    if (connection.status !== "pending") {
      return { success: false, error: "This request has already been processed" };
    }
    
    // Update the connection
    const updatedConnection = await storage.updateConnectionStatus(connectionId, "accepted");
    if (!updatedConnection) {
      return { success: false, error: "Failed to accept the request" };
    }
    
    return { success: true, connection: updatedConnection };
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return { success: false, error: "An error occurred while accepting the friend request" };
  }
}

/**
 * Reject a friend request
 * @param userId The user rejecting the request
 * @param connectionId The ID of the connection to reject
 * @returns Result object with success flag and result or error message
 */
export async function rejectFriendRequest(
  userId: number, 
  connectionId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the connection
    const connection = await storage.getUserConnectionById(connectionId);
    if (!connection) {
      return { success: false, error: "Connection not found" };
    }
    
    // Ensure the user is the recipient
    if (connection.recipientId !== userId) {
      return { success: false, error: "You cannot reject this request" };
    }
    
    // Ensure the connection is pending
    if (connection.status !== "pending") {
      return { success: false, error: "This request has already been processed" };
    }
    
    // Update the connection
    await storage.updateConnectionStatus(connectionId, "rejected");
    
    return { success: true };
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return { success: false, error: "An error occurred while rejecting the friend request" };
  }
}

/**
 * Get all of a user's friends (accepted connections)
 * @param userId The user's ID
 * @returns Array of users who are friends
 */
export async function getUserFriends(userId: number): Promise<User[]> {
  try {
    // Get all connections for the user
    const connections = await storage.getUserConnections(userId);
    if (!connections || connections.length === 0) {
      return [];
    }
    
    // Filter for accepted connections
    const acceptedConnections = connections.filter(conn => conn.status === "accepted");
    
    // Get the friend IDs
    const friendIds = acceptedConnections.map(conn => 
      conn.requesterId === userId ? conn.recipientId : conn.requesterId
    );
    
    // Get the friend users
    const friends: User[] = [];
    for (const id of friendIds) {
      const friend = await storage.getUser(id);
      if (friend) {
        friends.push(friend);
      }
    }
    
    return friends;
  } catch (error) {
    console.error("Error getting user friends:", error);
    return [];
  }
}

/**
 * Notify all friends about a new poem
 * @param userId The author's user ID
 * @param poemId The ID of the new poem
 */
export async function notifyFriendsAboutNewPoem(userId: number, poemId: number): Promise<void> {
  try {
    // Get the author 
    const author = await storage.getUser(userId);
    if (!author) return;
    
    // Get the poem
    const poem = await storage.getPoemById(poemId);
    if (!poem) return;
    
    // Get all friends
    const friends = await getUserFriends(userId);
    
    // Notify each friend
    for (const friend of friends) {
      await notifyAboutNewPoem(author, friend, poem);
    }
  } catch (error) {
    console.error("Error notifying friends about new poem:", error);
  }
}