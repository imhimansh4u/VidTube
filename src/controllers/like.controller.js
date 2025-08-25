import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Like } from "../models/like.models.js";
import { asyncHandler} from "../utils/asyncHandler.js";
import { Mongoose } from "mongoose";
import { Video } from "../models/video.models.js";
import {User} from "../models/user.models.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  const video = await Video.findById(videoId).select("-IsPublished");

  if(!video){
    console.log("The Video is not found");
    throw new ApiError(404,"This video is not found : ");
  }

  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized request");

  const isLiked = await Like.findOne({
    video : videoId,
    likedby : userId,
  })

  let responsemessage;
  let updatedVideo;

  if(isLiked){
    // we have firstly deleted the document containig the liked information
    await Like.findByIdAndDelete(isLiked._id);
    console.log("Video is now unLiked");
    updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {$inc : {totalLikes : -1}},
      {new : true}
    )
    responsemessage = "Video Unliked Succesfully"
  }
  else{
    await Like.create({
      video : videoId,
      likedby: userId,
    })
    updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      { $inc: { totalLikes: 1 } },
      { new: true }
    );
    console.log("Video Liked Succesfully");
    responsemessage = "Video liked succesfully";
  }

  return res
          .status(200)
          .json(new ApiResponse(
            200,
          {
            isLiked : !isLiked,
            totalLikes : updatedVideo.totalLikes
          },
          responsemessage
        ))
  
  
});


export { toggleVideoLike };