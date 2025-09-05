import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.models.js"
import mongoose from "mongoose"
import {Video} from "../models/video.models.js"
import {Subscription} from "../models/subsciption.models.js"


// controller to display all the details of a channel , its total subscribers , videos , total Likes and other details also 

const displayChannelDetails = asyncHandler(async (req,res)=>{
    // grab the channelname from
    const {channelName} = req.params; 
    const channel = await User.findOne({username : channelName});

    if(!channel){
        console.log("Channel is not found");
        throw new ApiError(404,"This Channel is not found");
    }

    const channelId = new mongoose.Types.ObjectId(channel._id);

    // Have to design and show details like total subscribers , total Videos , total comments , total Likes 
    
    const channelStats = await Video.aggregate([
      { $match: { owner: channelId } },

      // Lookup likes for each video
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "Likes",
        },
      },

      // Lookup comments for each video
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "video",
          as: "Comments",
        },
      },

      // Add counts for each video
      {
        $addFields: {
          likesCount: { $size: "$Likes" },
          commentsCount: { $size: "$Comments" },
        },
      },

      // Group to calculate totals while preserving per-video info
      {
        $group: {
          _id: null,
          videos: {
            $push: {
              _id: "$_id",
              title: "$title",
              likesCount: "$likesCount",
              commentsCount: "$commentsCount",
            },
          },
          totalLikes: { $sum: "$likesCount" },
          totalComments: { $sum: "$commentsCount" },
          totalVideos: { $sum: 1 },
        },
      },
    ]);
     
    const stats = channelStats[0] || {};
    // Now for total subscribers 
    const totalSubscribers = await Subscription.countDocuments({channel : channelId}) || 0;
    let TotalSubs;
    stats.TotalSubs = totalSubscribers;

    return res.
        status(200)
        .json(new ApiResponse(
            200,
            stats,
            "Here are the stats of this channel"
        ))
})

//controller to get all the Videos uploaded by the Channel 
const allVideosOfChannel = asyncHandler(async (req,res)=>{
    // firstly grab the channel id 
    const {channelname} = req.params;
    const {page=1, limit=10, sortBy="createdAT" , sortType="desc"} = req.query;
    // NOTE-> here channel name is the Username
    const channel = await User.findOne({username : channelname});
    if(!channel){
        console.log("This channel is not found");
        
        throw new ApiError(404,"Channel is Not found");
    }
    const channelId  = channel?._id;
    const AllVideos = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(channelId),
            }
        },
        {
            $sort : {
                [sortBy] : sortType === 'asc'?1 : -1
            }
        },
        // Now this stage will skip the pages upto the required page
        {
            $skip : (page-1)*limit,
        },
        // Now limit the no. of documents to 10 videos per page only 
        {
            $limit : parseInt(limit),
        },
    ])

    return res
           .status(200)
           .json(new ApiResponse(
            200,
            AllVideos,
            "Here are all the Videos of this Channel"
           ))
})

export {
    displayChannelDetails,
    allVideosOfChannel
}