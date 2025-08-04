import mongoose, { Schema } from "mongoose";

const SubscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // This will give , which channel does the user has subscribed
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // This will give the subscriber of that user
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", SubscriptionSchema);
