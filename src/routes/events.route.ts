import { Router } from "express";
import { authMiddleware } from "../middleware";
import { allEvents, createEvents, deleteEvent, getEvent, updateEvent } from "../controllers/events.controller";

const eventRoutes=Router();

eventRoutes.use(authMiddleware);

// GET /api/events - Get all events for the logged-in user
eventRoutes.get('/api/events', allEvents);

// POST /api/events - Create a new event
eventRoutes.post('/api/events', createEvents);

// GET /api/events/:id - Get a specific event
eventRoutes.get('/api/events/:id', getEvent);

// PUT /api/events/:id - Update an event
eventRoutes.put('/api/events/:id', updateEvent);

// DELETE /api/events/:id - Delete an event
eventRoutes.delete('/api/events/:id', deleteEvent);

export default eventRoutes;