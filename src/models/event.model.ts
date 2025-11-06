import { Schema, model, Document, Types } from "mongoose";

export enum EventStatus {
  BUSY = 'BUSY',
  SWAPPABLE = 'SWAPPABLE',
  SWAP_PENDING = 'SWAP_PENDING'
}

export interface IEvent extends Document {
  title: string;
  body: string;
  status: EventStatus;
  startTime: Date;
  endTime: Date;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(EventStatus),
      default: EventStatus.BUSY
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    body: {
      type: String,
      required: [true, "Body is required"],
      minlength: [1, "Note cannot be empty"]
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"]
    }
  },
  { timestamps: true }
);

export const Event = model<IEvent>("Event", EventSchema);