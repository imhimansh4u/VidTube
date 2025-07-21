import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // cloudnary url
      required: true,
    },
    thumbnail: {
      type: String, // cloundary url
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0, // by default the views is 0
    },
    IsPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);

// Note Point
//1.)
/**
 * It is a tool (plugin) that helps you break big results into smaller pages when using complex queries (called aggregation)
 * in MongoDB using Mongoose.
 */

//2.)

/**
 *That’s what aggregation does — it helps you:

Group things

Count them

Sort them

Filter them

Even join data from other collections
 */
