import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertPoemSchema, 
  insertImageSchema, 
  insertCommentSchema, 
  insertMessageSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server for chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store active connections with user IDs
  const connections = new Map<number, WebSocket>();

  wss.on('connection', (ws) => {
    let userId: number | null = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle authentication
        if (data.type === 'auth') {
          userId = data.userId;
          connections.set(userId, ws);
          console.log(`User ${userId} connected to WebSocket`);
        }

        // Handle chat messages
        if (data.type === 'message' && userId) {
          const messageData = insertMessageSchema.parse({
            senderId: userId,
            receiverId: data.receiverId,
            content: data.content,
            imageData: data.imageData || null
          });

          // Store the message
          const savedMessage = await storage.createMessage(messageData);

          // Send to recipient if they're connected
          const recipientWs = connections.get(data.receiverId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'message',
              message: savedMessage
            }));
          }

          // Send confirmation back to sender
          ws.send(JSON.stringify({
            type: 'message_sent',
            message: savedMessage
          }));
        }

        // Handle "read" confirmations
        if (data.type === 'mark_read' && userId) {
          await storage.markMessagesAsRead(userId, data.senderId);

          // Notify the original sender if they're connected
          const senderWs = connections.get(data.senderId);
          if (senderWs && senderWs.readyState === WebSocket.OPEN) {
            senderWs.send(JSON.stringify({
              type: 'messages_read',
              by: userId
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    });

    ws.on('close', () => {
      if (userId) {
        connections.delete(userId);
        console.log(`User ${userId} disconnected from WebSocket`);
      }
    });
  });

  // API Routes
  // Poems
  app.get('/api/poems', async (req, res) => {
    try {
      const poems = await storage.getAllPoems();
      res.json(poems);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch poems' });
    }
  });
  
  app.get('/api/poems/accessible', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const poems = await storage.getAccessiblePoems(userId);
      res.json(poems);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch accessible poems' });
    }
  });

  app.get('/api/poems/user/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const poems = await storage.getPoemsByUserId(userId);
      res.json(poems);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch poems' });
    }
  });

  app.get('/api/poems/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const poem = await storage.getPoemById(id);
      
      if (!poem) {
        return res.status(404).json({ message: 'Poem not found' });
      }
      
      res.json(poem);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch poem' });
    }
  });

  app.post('/api/poems', ensureAuthenticated, async (req, res) => {
    try {
      const poemData = insertPoemSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const poem = await storage.createPoem(poemData);
      res.status(201).json(poem);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: 'Failed to create poem' });
    }
  });

  app.put('/api/poems/:id', ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const poem = await storage.getPoemById(id);
      
      if (!poem) {
        return res.status(404).json({ message: 'Poem not found' });
      }
      
      if (poem.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to update this poem' });
      }
      
      const updatedPoem = await storage.updatePoem(id, req.body);
      res.json(updatedPoem);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: 'Failed to update poem' });
    }
  });

  app.delete('/api/poems/:id', ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const poem = await storage.getPoemById(id);
      
      if (!poem) {
        return res.status(404).json({ message: 'Poem not found' });
      }
      
      if (poem.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this poem' });
      }
      
      await storage.deletePoem(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete poem' });
    }
  });

  // Images
  app.get('/api/poems/:poemId/images', async (req, res) => {
    try {
      const poemId = parseInt(req.params.poemId);
      const images = await storage.getImagesByPoemId(poemId);
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch images' });
    }
  });

  app.post('/api/poems/:poemId/images', ensureAuthenticated, async (req, res) => {
    try {
      const poemId = parseInt(req.params.poemId);
      const poem = await storage.getPoemById(poemId);
      
      if (!poem) {
        return res.status(404).json({ message: 'Poem not found' });
      }
      
      if (poem.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to add images to this poem' });
      }
      
      const imageData = insertImageSchema.parse({
        ...req.body,
        poemId
      });
      
      const image = await storage.createImage(imageData);
      res.status(201).json(image);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: 'Failed to upload image' });
    }
  });

  app.delete('/api/images/:id', ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteImage(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete image' });
    }
  });

  // Comments
  app.get('/api/poems/:poemId/comments', async (req, res) => {
    try {
      const poemId = parseInt(req.params.poemId);
      const comments = await storage.getCommentsByPoemId(poemId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch comments' });
    }
  });

  app.post('/api/poems/:poemId/comments', ensureAuthenticated, async (req, res) => {
    try {
      const poemId = parseInt(req.params.poemId);
      const poem = await storage.getPoemById(poemId);
      
      if (!poem) {
        return res.status(404).json({ message: 'Poem not found' });
      }
      
      const commentData = insertCommentSchema.parse({
        ...req.body,
        poemId,
        userId: req.user.id
      });
      
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: 'Failed to create comment' });
    }
  });

  app.delete('/api/comments/:id', ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteComment(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  });

  // Messages
  app.get('/api/messages/:otherUserId', ensureAuthenticated, async (req, res) => {
    try {
      const currentUserId = req.user.id;
      const otherUserId = parseInt(req.params.otherUserId);
      
      const messages = await storage.getMessagesBetweenUsers(currentUserId, otherUserId);
      
      // Mark messages as read
      await storage.markMessagesAsRead(currentUserId, otherUserId);
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Poem Read Status
  app.get('/api/poems/:poemId/read-status', ensureAuthenticated, async (req, res) => {
    try {
      const poemId = parseInt(req.params.poemId);
      const userId = req.user.id;
      
      const isRead = await storage.getPoemReadStatus(poemId, userId);
      res.json({ isRead });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get read status' });
    }
  });

  app.post('/api/poems/:poemId/mark-read', ensureAuthenticated, async (req, res) => {
    try {
      const poemId = parseInt(req.params.poemId);
      const userId = req.user.id;
      
      const poemRead = await storage.markPoemAsRead(poemId, userId);
      res.status(201).json(poemRead);
    } catch (error) {
      res.status(500).json({ message: 'Failed to mark poem as read' });
    }
  });

  app.get('/api/poems/unread/count', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadPoemCount(userId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get unread count' });
    }
  });

  // Connection/Friend endpoints
  app.get('/api/connections', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const connections = await storage.getUserConnections(userId);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get connections' });
    }
  });

  app.get('/api/connections/pending', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const pendingRequests = await storage.getPendingConnectionRequests(userId);
      res.json(pendingRequests);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get pending requests' });
    }
  });

  app.post('/api/connections/:userId', ensureAuthenticated, async (req, res) => {
    try {
      const requesterId = req.user.id;
      const addresseeId = parseInt(req.params.userId);
      
      // Check if connection already exists
      const existingConnection = await storage.getConnection(requesterId, addresseeId);
      if (existingConnection) {
        return res.status(400).json({ message: 'Connection already exists' });
      }
      
      const connection = await storage.createConnection({
        requesterId,
        addresseeId,
        status: 'pending'
      });
      
      res.status(201).json(connection);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create connection request' });
    }
  });

  app.put('/api/connections/:connectionId', ensureAuthenticated, async (req, res) => {
    try {
      const connectionId = parseInt(req.params.connectionId);
      const userId = req.user.id;
      const { status } = req.body;
      
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const connection = await storage.updateConnectionStatus(connectionId, status);
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }
      
      res.json(connection);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update connection' });
    }
  });

  // AI Image Generation
  app.post('/api/generate-image', ensureAuthenticated, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: 'Prompt is required' });
      }
      
      const imageData = await storage.generateAiImage(prompt);
      res.json({ imageData });
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate image' });
    }
  });

  // PDF Export
  app.post('/api/export-poems-pdf', ensureAuthenticated, async (req, res) => {
    try {
      const { poemIds } = req.body;
      if (!poemIds || !Array.isArray(poemIds) || poemIds.length === 0) {
        return res.status(400).json({ message: 'Valid poem IDs array is required' });
      }
      
      const pdfData = await storage.generatePoemPdf(poemIds);
      res.json({ pdfData });
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  return httpServer;
}
