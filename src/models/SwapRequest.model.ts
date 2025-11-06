import mongoose from "mongoose";
import { model, Document, Schema } from "mongoose";

export enum SwapRequestStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED'
}

interface ISwapRequest extends Document {
    initiatorId: mongoose.Types.ObjectId;
    receiverId: mongoose.Types.ObjectId;
    initiatorSlotId: mongoose.Types.ObjectId;
    receiverSlotId: mongoose.Types.ObjectId;
    status: SwapRequestStatus;
    createdAt: Date;
    updatedAt: Date;
}

const SwapRequestSchema = new Schema<ISwapRequest>({
    initiatorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    receiverId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    initiatorSlotId: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    receiverSlotId: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    status: {
        type: String,
        enum: Object.values(SwapRequestStatus),
        default: SwapRequestStatus.PENDING
    }
}, {
    timestamps: true
});

export const SwapRequest = model<ISwapRequest>('SwapRequest', SwapRequestSchema); 