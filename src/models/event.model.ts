import { Schema, model, Document, Types } from "mongoose";

export interface IEvent extends Document {
  title: string;
  body: string;
  startTime: Date;
  endTime: Date;
  author: Types.ObjectId;
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
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"]
    }
  },
  { timestamps: true }
);

export const Event = model<IEvent>("Event", EventSchema);