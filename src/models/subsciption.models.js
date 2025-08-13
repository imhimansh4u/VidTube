import mongoose, { Schema } from "mongoose";

const SubscriptionSchema = new Schema(
  {
    // for a user who is logged in VidTube the subscriber field will help him to get all the channels he has subscribedTo
    subscriber: {
      type: Schema.Types.ObjectId,  //This field will store the ID of the logged-in user who is performing the subscription action.
      ref: "User",
    },
    // For a user who is logged in VidTube the channel field will give him all His subscribers count (bcs he is listed here)
    channel: {
      type: Schema.Types.ObjectId,  //This field will store the ID of the user whose channel is being subscribed to.
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", SubscriptionSchema);
