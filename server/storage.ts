import { 
  users, type User, type InsertUser,
  poems, type Poem, type InsertPoem,
  images, type Image, type InsertImage,
  comments, type Comment, type InsertComment,
  messages, type Message, type InsertMessage,
  poemReads, type PoemRead, type InsertPoemRead,
  connections, type Connection, type InsertConnection
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Poem operations
  getAllPoems(): Promise<Poem[]>;
  getPoemsByUserId(userId: number): Promise<Poem[]>;
  getAccessiblePoems(userId: number): Promise<Poem[]>; // Get poems user can access (own or friends)
  getPoemById(id: number): Promise<Poem | undefined>;
  createPoem(poem: InsertPoem): Promise<Poem>;
  updatePoem(id: number, poem: Partial<InsertPoem>): Promise<Poem | undefined>;
  deletePoem(id: number): Promise<boolean>;
  
  // Image operations
  getImagesByPoemId(poemId: number): Promise<Image[]>;
  createImage(image: InsertImage): Promise<Image>;
  deleteImage(id: number): Promise<boolean>;
  generateAiImage(prompt: string): Promise<string>; // Returns image data
  
  // Comment operations
  getCommentsByPoemId(poemId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;
  
  // Message operations
  getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(receiverId: number, senderId: number): Promise<boolean>;
  
  // PoemRead operations
  getPoemReadStatus(poemId: number, userId: number): Promise<boolean>;
  markPoemAsRead(poemId: number, userId: number): Promise<PoemRead>;
  getUnreadPoemCount(userId: number): Promise<number>;
  
  // Connection operations
  getConnection(user1Id: number, user2Id: number): Promise<Connection | undefined>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnectionStatus(id: number, status: string): Promise<Connection | undefined>;
  getUserConnections(userId: number): Promise<Connection[]>;
  getPendingConnectionRequests(userId: number): Promise<Connection[]>;
  
  // Session store
  sessionStore: session.SessionStore;
  
  // Export operations
  generatePoemPdf(poemIds: number[]): Promise<string>; // Returns PDF data as base64
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private poems: Map<number, Poem>;
  private images: Map<number, Image>;
  private comments: Map<number, Comment>;
  private messages: Map<number, Message>;
  private poemReads: Map<number, PoemRead>;
  private connections: Map<number, Connection>;
  sessionStore: session.Store;
  
  private nextUserId: number;
  private nextPoemId: number;
  private nextImageId: number;
  private nextCommentId: number;
  private nextMessageId: number;
  private nextPoemReadId: number;
  private nextConnectionId: number;

  constructor() {
    this.users = new Map();
    this.poems = new Map();
    this.images = new Map();
    this.comments = new Map();
    this.messages = new Map();
    this.poemReads = new Map();
    this.connections = new Map();
    
    this.nextUserId = 1;
    this.nextPoemId = 1;
    this.nextImageId = 1;
    this.nextCommentId = 1;
    this.nextMessageId = 1;
    this.nextPoemReadId = 1;
    this.nextConnectionId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.nextUserId++;
    const user: User = {
      ...insertUser,
      id,
      email: null,
      phone: null,
      notificationPreferences: {
        emailEnabled: false,
        smsEnabled: false,
        newPoemNotification: true,
        commentNotification: true
      }
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Poem operations
  async getAllPoems(): Promise<Poem[]> {
    return Array.from(this.poems.values()).sort((a, b) => {
      // Sort newest first
      const dateA = new Date(a.createdAt || Date.now());
      const dateB = new Date(b.createdAt || Date.now());
      return dateB.getTime() - dateA.getTime();
    });
  }

  async getPoemsByUserId(userId: number): Promise<Poem[]> {
    return Array.from(this.poems.values())
      .filter(poem => poem.userId === userId)
      .sort((a, b) => {
        // Sort newest first
        const dateA = new Date(a.createdAt || Date.now());
        const dateB = new Date(b.createdAt || Date.now());
        return dateB.getTime() - dateA.getTime();
      });
  }

  async getPoemById(id: number): Promise<Poem | undefined> {
    return this.poems.get(id);
  }

  async createPoem(insertPoem: InsertPoem): Promise<Poem> {
    const id = this.nextPoemId++;
    const createdAt = new Date();
    const poem: Poem = { ...insertPoem, id, createdAt };
    this.poems.set(id, poem);
    return poem;
  }

  async updatePoem(id: number, poemData: Partial<InsertPoem>): Promise<Poem | undefined> {
    const poem = this.poems.get(id);
    if (!poem) return undefined;

    const updatedPoem: Poem = { ...poem, ...poemData };
    this.poems.set(id, updatedPoem);
    return updatedPoem;
  }

  async deletePoem(id: number): Promise<boolean> {
    return this.poems.delete(id);
  }

  // Image operations
  async getImagesByPoemId(poemId: number): Promise<Image[]> {
    return Array.from(this.images.values())
      .filter(image => image.poemId === poemId);
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = this.nextImageId++;
    const createdAt = new Date();
    const image: Image = { ...insertImage, id, createdAt };
    this.images.set(id, image);
    return image;
  }

  async deleteImage(id: number): Promise<boolean> {
    return this.images.delete(id);
  }

  // Comment operations
  async getCommentsByPoemId(poemId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.poemId === poemId)
      .sort((a, b) => {
        // Sort by creation date
        const dateA = new Date(a.createdAt || Date.now());
        const dateB = new Date(b.createdAt || Date.now());
        return dateA.getTime() - dateB.getTime();
      });
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.nextCommentId++;
    const createdAt = new Date();
    const comment: Comment = { ...insertComment, id, createdAt };
    this.comments.set(id, comment);
    return comment;
  }

  async deleteComment(id: number): Promise<boolean> {
    return this.comments.delete(id);
  }

  // Message operations
  async getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => 
        (message.senderId === user1Id && message.receiverId === user2Id) ||
        (message.senderId === user2Id && message.receiverId === user1Id)
      )
      .sort((a, b) => {
        // Sort by creation date
        const dateA = new Date(a.createdAt || Date.now());
        const dateB = new Date(b.createdAt || Date.now());
        return dateA.getTime() - dateB.getTime();
      });
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.nextMessageId++;
    const createdAt = new Date();
    const message: Message = { ...insertMessage, id, createdAt, isRead: false };
    this.messages.set(id, message);
    return message;
  }

  async markMessagesAsRead(receiverId: number, senderId: number): Promise<boolean> {
    for (const [key, message] of this.messages.entries()) {
      if (message.receiverId === receiverId && message.senderId === senderId && !message.isRead) {
        this.messages.set(key, { ...message, isRead: true });
      }
    }
    return true;
  }
}

export const storage = new MemStorage();
