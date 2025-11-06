import { Router } from "express";
import { authMiddleware } from "../middleware";
import { Request,Response } from "express";
import { EventStatus } from "../models/event.model";
import { Event } from "../models/event.model";
import mongoose from "mongoose";
import { SwapRequestStatus } from "../models/SwapRequest.model";
import { SwapRequest } from "../models/SwapRequest.model";
import { IUser } from "../models/user.model";

const swapRoutes=Router();

// GET /api/swappable-slots - Get all swappable slots from other users
swapRoutes.get('/api/swappable-slots', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user=req.user as IUser;
    const slots = await Event.find({
      status: EventStatus.SWAPPABLE,
      userId: { $ne: user.id } // Exclude current user's slots
    })
      .populate('userId', 'name email')
      .sort({ startTime: 1 });

    res.json(slots);
  } catch (error) {
    console.error('Error fetching swappable slots:', error);
    res.status(500).json({ error: 'Failed to fetch swappable slots' });
  }
});

// POST /api/swap-request - Initiate a swap request
swapRoutes.post('/api/swap-request', authMiddleware, async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const user=req.user as IUser;

  try {
    const { mySlotId, theirSlotId } = req.body;

    if (!mySlotId || !theirSlotId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!mongoose.Types.ObjectId.isValid(mySlotId) || 
        !mongoose.Types.ObjectId.isValid(theirSlotId)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid slot ID format' });
    }

    // Verify mySlot exists, belongs to user, and is swappable
    const mySlot = await Event.findOne({
      _id: mySlotId,
      userId: user.id
    }).session(session);

    if (!mySlot) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Your slot not found' });
    }

    if (mySlot.status !== EventStatus.SWAPPABLE) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Your slot is not available for swapping' });
    }

    // Verify theirSlot exists, doesn't belong to user, and is swappable
    const theirSlot = await Event.findById(theirSlotId).session(session);

    if (!theirSlot) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Requested slot not found' });
    }

    if (theirSlot.userId.toString() === user.id) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Cannot swap with your own slot' });
    }

    if (theirSlot.status !== EventStatus.SWAPPABLE) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Requested slot is not available for swapping' });
    }

    // Check for existing pending swap requests involving these slots
    const existingRequest = await SwapRequest.findOne({
      $or: [
        { initiatorSlotId: mySlotId, status: SwapRequestStatus.PENDING },
        { receiverSlotId: mySlotId, status: SwapRequestStatus.PENDING },
        { initiatorSlotId: theirSlotId, status: SwapRequestStatus.PENDING },
        { receiverSlotId: theirSlotId, status: SwapRequestStatus.PENDING }
      ]
    }).session(session);

    if (existingRequest) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'One or both slots already have pending swap requests' 
      });
    }

    // Create swap request
    const swapRequest = await SwapRequest.create([{
      initiatorId: user.id,
      receiverId: theirSlot.userId,
      initiatorSlotId: mySlotId,
      receiverSlotId: theirSlotId,
      status: SwapRequestStatus.PENDING
    }], { session });

    // Update both slots to SWAP_PENDING
    await Event.findByIdAndUpdate(
      mySlotId,
      { status: EventStatus.SWAP_PENDING },
      { session }
    );

    await Event.findByIdAndUpdate(
      theirSlotId,
      { status: EventStatus.SWAP_PENDING },
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(swapRequest[0]);
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error creating swap request:', error);
    res.status(500).json({ error: error.message || 'Failed to create swap request' });
  } finally {
    session.endSession();
  }
});

// GET /api/swap-requests - Get all swap requests for the user
swapRoutes.get('/api/swap-requests', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user=req.user as IUser;
    const requests = await SwapRequest.find({
      $or: [
        { initiatorId: user.id },
        { receiverId: user.id }
      ]
    })
      .populate('initiatorId', 'name email')
      .populate('receiverId', 'name email')
      .populate('initiatorSlotId')
      .populate('receiverSlotId')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching swap requests:', error);
    res.status(500).json({ error: 'Failed to fetch swap requests' });
  }
});

// POST /api/swap-response/:requestId - Respond to a swap request
swapRoutes.post('/api/swap-response/:requestId', authMiddleware, async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const user=req.user as IUser;
  try {
    const { requestId } = req.params;
    const { accepted } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid request ID format' });
    }

    if (typeof accepted !== 'boolean') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'accepted field must be a boolean' });
    }

    // Get the swap request with populated slots
    const swapRequest = await SwapRequest.findById(requestId)
      .populate('initiatorSlotId')
      .populate('receiverSlotId')
      .session(session);

    if (!swapRequest) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Swap request not found' });
    }

    // Verify the user is the receiver
    if (swapRequest.receiverId.toString() !== user.id) {
      await session.abortTransaction();
      return res.status(403).json({ 
        error: 'Unauthorized: You are not the receiver of this swap request' 
      });
    }

    // Check if request is still pending
    if (swapRequest.status !== SwapRequestStatus.PENDING) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: `Swap request is already ${swapRequest.status.toLowerCase()}` 
      });
    }

    if (!accepted) {
      // REJECTION LOGIC
      // Update swap request status to REJECTED
      swapRequest.status = SwapRequestStatus.REJECTED;
      await swapRequest.save({ session });

      // Set both slots back to SWAPPABLE
      await Event.findByIdAndUpdate(
        swapRequest.initiatorSlotId,
        { status: EventStatus.SWAPPABLE },
        { session }
      );

      await Event.findByIdAndUpdate(
        swapRequest.receiverSlotId,
        { status: EventStatus.SWAPPABLE },
        { session }
      );

      await session.commitTransaction();
      res.json(swapRequest);
    } else {
      // ACCEPTANCE LOGIC - THE KEY TRANSACTION
      // Update swap request status to ACCEPTED
      swapRequest.status = SwapRequestStatus.ACCEPTED;
      await swapRequest.save({ session });

      // Get the slots with full data
      const initiatorSlot = swapRequest.initiatorSlotId as any;
      const receiverSlot = swapRequest.receiverSlotId as any;

      // Store original owner IDs
      const initiatorOriginalUserId = initiatorSlot.userId;
      const receiverOriginalUserId = receiverSlot.userId;

      // SWAP THE OWNERS
      // Update initiator's slot to belong to receiver
      await Event.findByIdAndUpdate(
        swapRequest.initiatorSlotId,
        {
          userId: receiverOriginalUserId,
          status: EventStatus.BUSY
        },
        { session }
      );

      // Update receiver's slot to belong to initiator
      await Event.findByIdAndUpdate(
        swapRequest.receiverSlotId,
        {
          userId: initiatorOriginalUserId,
          status: EventStatus.BUSY
        },
        { session }
      );

      await session.commitTransaction();
      res.json(swapRequest);
    }
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Error processing swap response:', error);
    res.status(500).json({ error: error.message || 'Failed to process swap response' });
  } finally {
    session.endSession();
  }
});


export default swapRoutes;