import { Request, Response } from "express";
import { Event, EventStatus } from "../models/event.model";
import mongoose from "mongoose";
import { IUser } from "../models/user.model";

export const allEvents = async (req: Request, res: Response) => {

    const user = req.user as IUser;

    try {
        const events = await Event.find({ userId: user.id })
            .sort({ startTime: 1 });
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
}

export const createEvents = async (req: Request, res: Response) => {
    try {
        const { title, startTime, endTime, status } = req.body;
        const user = req.user as IUser;

        // Validation
        if (!title || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }

        const event = await Event.create({
            title,
            startTime: start,
            endTime: end,
            status: status || EventStatus.BUSY,
            userId: user.id
        });

        res.status(201).json(event);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
}

export const getEvent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as IUser;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const event = await Event.findOne({
            _id: id,
            userId: user.id
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.json(event);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
}

export const updateEvent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, startTime, endTime, status } = req.body;
        const user = req.user as IUser;


        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        // Check if event exists and belongs to user
        const existingEvent = await Event.findOne({
            _id: id,
            userId: user.id
        });

        if (!existingEvent) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Prevent status changes if there's a pending swap
        if (existingEvent.status === EventStatus.SWAP_PENDING &&
            status && status !== EventStatus.SWAP_PENDING) {
            return res.status(400).json({
                error: 'Cannot modify event with pending swap request'
            });
        }

        const updateData: any = {};
        if (title) updateData.title = title;
        if (startTime) {
            const start = new Date(startTime);
            if (endTime || existingEvent.endTime) {
                const end = endTime ? new Date(endTime) : existingEvent.endTime;
                if (start >= end) {
                    return res.status(400).json({ error: 'End time must be after start time' });
                }
            }
            updateData.startTime = start;
        }
        if (endTime) {
            const end = new Date(endTime);
            const start = startTime ? new Date(startTime) : existingEvent.startTime;
            if (start >= end) {
                return res.status(400).json({ error: 'End time must be after start time' });
            }
            updateData.endTime = end;
        }
        if (status) updateData.status = status;

        const event = await Event.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json(event);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
}

export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user as IUser;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        // Check if event exists and belongs to user
        const existingEvent = await Event.findOne({
            _id: id,
            userId: user.id
        });

        if (!existingEvent) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Prevent deletion if there's a pending swap
        if (existingEvent.status === EventStatus.SWAP_PENDING) {
            return res.status(400).json({
                error: 'Cannot delete event with pending swap request'
            });
        }

        await Event.findByIdAndDelete(id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
}