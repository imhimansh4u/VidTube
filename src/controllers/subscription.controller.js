import mongoose from "mongoose";
import {User} from "../models/user.models.js"
import {Subscription} from "../models/subsciption.models.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {  
  const { channelId } = req.params;
  // TODO: toggle subscription
  // firstly find the user with channelId , which is the userid of the owner of that video
  const Channel = await User.findById(channelId).select(
    "-password -refreshToken -watchHistory -email"
  );
  if(!Channel){
    console.log("The Channel You are Searching for Doesn,t Exists");
    throw new ApiError(400, "The Channel You are Searching for Doesn,t Exists");
  }
  const user = await User.findById(req.user?._id).select("-password -refreshToken");
  
  const isSubscribed = await Subscription.findOne({
    subscriber : user._id,
    channel : channelId,
  })

  let updatedChannel;
  let responseMessage;
  let newSubscription;
  if(isSubscribed){
    // if isSubscribed , it means the user has subscribed the channel , so we have to delete the document to unsubscribe 
    await Subscription.findByIdAndDelete(isSubscribed._id);
    //Now also remember to delete the subscription count of that channel
    updatedChannel = User.findByIdAndUpdate(
      channelId, 
      {  $inc: { subscribersCount: -1 },},
      {new : true} // It will return the Updated Document
    );
    responseMessage = "Channel Unsubscribed Succesfully";
  }
  else{
    // It means that the user has not subscribed the channel , so we need to subscribe it
    // We need to subscribe by creating a new subscription document.
    newSubscription = await Subscription.create({
      subscriber : user._id,
      channel : channelId,
    });
    // Now we also need to update the total subscribers count 
     updatedChannel = User.findByIdAndUpdate(
      channelId,
      {$inc : {subscribersCount : 1}},
      {new:true}
     );
     responseMessage = "Channel Subscribed Succesfully";
  }

  // send the response message
  return res
          .status(200)
          .json(new ApiResponse(
            200,
            {
              isSubscribed : !isSubscribed,
              channel : updatedChannel,
            },
            responseMessage
          ))
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const {channelId} = req.params;
  const channel = await User.findById(channelId);
  if(!channel){
    console.log("The channel is not found");
    throw new ApiError(404,"The channel is not found..");
  }

  const AllSubscribers = await Subscription.aggregate([
    // first will be match stage
    {
      $match: { channel: new mongoose.Types.ObjectId(channelId) },
    },
    // Now lookup stage to find the names of the subscribers
    {
      $lookup: {
        from: "users",        // bcs in the mongoDB collections are always stored in plural form and in lowercase (even User gets converted automatically into users)
        localField: "subscriber",
        foreignField: "_id",
        as: "SubscriberDetails",
      },
    },
    {
      $unwind: "$SubscriberDetails",
    },
    {
      $project: {
        _id: "$SubscriberDetails._id",
        username: "$SubscriberDetails.username",
        avatar: "$SubscriberDetails.avatar",
        coverImage: "$SubscriberDetails.coverImage",
        fullName: "$SubscriberDetails.fullName",
      },
    },
  ]);
  let returnMessage;
  if(AllSubscribers.length == 0){
    returnMessage = "There is currently No subscribers of this Channel";
  }
  else{
    returnMessage = "Here are the subscribers List";
  }
  // Now simply return all the subscribers in the response 
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribersCount: AllSubscribers.length,
        subscribers: AllSubscribers,
      },
      returnMessage
    )
  );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
})

export{
  toggleSubscription,
  getUserChannelSubscribers,

}