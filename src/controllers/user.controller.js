import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { upload } from "../middlewares/multer.middlewares.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    // small check that the user is present already in the database or not
    if (!user) {
      throw new ApiError(404, "User is not found");
    }

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken; // since refreshTokens is already a field present in userSchema
    await user.save({ validateBeforeSave: false }); //This disables the Mongoose validation checks just for this save operation.
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("ERROR IN TOKEN GENERATION:", error);
    throw new ApiError(
      500,
      "Something went wrong while generating access and Refresh tokens"
    );
  }
};

// in this section we have designed a method for a user to register on the platform
const registerUser = asyncHandler(async (req, res) => {
  //TODO
  const { fullname, email, username, password } = req.body;

  // validation (Look into this in last , when you are done surfing all these things of the backend and frontend) {Explore more about validation}
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "") // see all the things like fullname , username,eamil ,password , these all things are in input form , so if anyone of these are empty , then throw a error
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // checking that a user already exists or not

  const existedUser = await User.findOne({
    // it will search in the data base and return  if the user with these email or username already exissts and return null if not found
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(410, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path; //This safely tries to get the local file path of the uploaded avatar image (if any).
  //Note -> (?.) This means: "If this part exists, go to the next level." and called as optional chaining
  // we named it as avatar because in user.routes.js , while recieving the image , there we named it as avatar

  const coverLocalPath = req.files?.coverImage?.[0]?.path; // For the cover image

  // Now we will upload the image of avatar and coverimage on cloudnary , because that is where we are saving these images
  let avatar;

  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    console.log("Avatar image uploaded succesfully", avatar);
  } catch (error) {
    console.log("Error uploading avatar", error);
    throw new ApiError(500, "Failed to upload avatar");
  }

  let coverImage;
  try {
    coverImage = await uploadOnCloudinary(coverLocalPath);
    console.log("coverImage image uploaded succesfully", coverImage);
  } catch (error) {
    console.log("Error uploading coverImage", error);
    throw new ApiError(500, "Failed to upload coverImage");
  }

  try {
    const newuser = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(newuser._id).select(
      //this will find the user from the database which we have just registered .. (its a good practice to things like in this way )
      "-password -refreshTokens" //The .select(...//code//...) part will simply not select the things written inside the select ... This will helps us to not select the unwanted data
    );

    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      ); // simply means that if the user we are trying to register fails then we have to throw a error
    }
    // if all went good
    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "user registered succesfully"));
  } catch (error) {
    console.log("Error while registering the user", error);
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id);
    }
    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      ); // simply means that if the user we are trying to register fails then we have to throw a error
    }
  }
});

const loginUser = asyncHandler(async (req, res, next) => {
  // get data from body (getting from the user (frontend))
  const { email, username, password } = req.body; // req.body is a object

  // now validation part
  if ([email, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(405, "Every field is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "Couldn't find the user , Please register");
  }
  // now validate password

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(404, "Please enter correct credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // A good practice
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshTokens"
  ); //it ensures that you are fetching fresh information from the database and also not spilling sensitive info such as password

  // again validation
  if (!loggedInUser) {
    throw new ApiError(
      404,
      "This user is not found , please try again logging or create a new Fresh Account"
    );
  }

  const options = {
    httpOnly: true, // This means: JavaScript on the frontend (like window.cookie) cannot access the cookie.
    secure: process.env.NODE_ENV === "production", // standard practice (This makes sure the cookie is only sent over HTTPS (not HTTP))
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options) //1.) Storing tokens in HTTP-only cookies is safer than localStorage or sessionStorage. 2.)Browsers automatically attach cookies to every request to your backend — so the user stays logged in.
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInUser, "User is logged in succesfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined, // it clears the resfreshToken data from the database
      },
    },
    { new: true } // This actually sets that the returned value will now be the new one ...
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options) //clear the access token information  from cookies.
    .clearCookie("refreshToken", options) // clear the refresh token information from cookies.
    .json(new ApiResponse(200, {}, "User is logged out seccessfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh Token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    ); // this line checks that the incoming refersh token is valid or not by checking the token secret associated with it , as someone may try to temper into the site
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refreshToken");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      // We will check that the incoming refresh tokens must match with the refresh tokens we have send in the database
      throw new ApiError(401, "Invalid refresh Token");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed Succesfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "something went wrong");
  }
});

// Below is the functionality to update the password (See its not recovering the password , its updating it)

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  // validation that password is correct or not
  const isPasswordValid = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordValid) {
    throw new ApiError(404, "Your current password is Invalid");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Your password is updated successfully"));
});

const currentUser = asyncHandler(async (req, res) => {
  const currentuserID = req.user?._id; // We are able to find req.user due to the auth middleware (remember it bro mere bhai)
  const currentUserDetails = await User.findById(currentuserID).select(
    "-password -refreshToken"
  );
  return res
    .status(200)
    .json(new ApiResponse(201, currentUserDetails, "Current User Details"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname } = req.body; // we will get the fullname from the req to update
  if (!fullname) {
    throw new ApiError(400, "Fullname is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname: fullname,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res.status(200).json(200, user, "fullname is updated");
});

// Now to update the avatar image
const updateAvatar = asyncHandler(async (req, res) => {
  const newavatarlocalpath = req?.file?.path;
  // check
  if (!newavatarlocalpath) {
    throw new ApiError(400, "New avatar image file is required");
  }

  //(find the user)
  const user = await User.findById(req.user._id);
  const oldavatar = user.avatar;
  const oldavatarpath = oldavatar?.public_id;

  // Now uplaod the newAvatar image on cloudinary
  let newavatar;
  try {
    newavatar = await uploadOnCloudinary(newavatarlocalpath); // newavatar will be a complex object containing information about the url , public_id and other things for that user
    console.log("The avatar image is uploaded succesfully", newavatar);
  } catch (error) {
    console.log("Error while uploading the image", error);
    throw new ApiError(
      400,
      "Error while uploading the avatar image onto the cloudinary"
    );
  }

  const updateduser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: newavatar.secure_url,
      },
    },
    { new: true }
  );
  //  delete the avatar image from the cloudinary which is already associated with this user

  try {
    if (oldavatar) {
      await deleteFromCloudinary(oldavatarpath);
      console.log("Old avatar image is deleted succesfully");
    }
  } catch (error) {
    console.log("Error while deleting old avatar from cloudinary ", error);
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updateduser,
        "The avatar image is uploaded sucessfully"
      )
    );
});

// To update the cover image
const updateCoverImage = asyncHandler(async (req, res) => {
  // grab the new cover image
  const newCoverImagelocalPath = req?.file?.path;
  // 2. Validate that a file was actually provided
  if (!newCoverImagelocalPath) {
    throw new ApiError(400, "New cover image file is required");
  }
  const user = await User.findById(req?.user._id);
  const oldCoverImage = user?.coverImage;
  const oldcoverImagePublicId = user?.coverImage?.public_id;
  // Now uplaod the newCoverImage to the cloudinary
  let newCoverImage;
  try {
    newCoverImage = await uploadOnCloudinary(newCoverImagelocalPath);
    console.log("The new Cover Image is uploaded successfully on cloudinary");
  } catch (error) {
    console.log(
      "Error while uplaoding the new Cover Image on cloudinary",
      error
    );
    throw new ApiError(400, "Failed to uplaod new Cover Image");
  }
  if (!newCoverImage.url) {
    throw new ApiError(500, "Something went wrong");
  }
  //Now update the new Cover Image associated with the user
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: newCoverImage.secure_url,
      },
    },
    { new: true }
  );
  //Now delete the old cover image uploaded on the cloudinary only if new CoverImage is uploaded on cloudinary as well as updated on the platform

  try {
    if (oldCoverImage) {
      await deleteFromCloudinary(oldcoverImagePublicId);
      console.log("Old Cover Image is Deleted Successfully");
    }
  } catch (error) {
    console.log(
      "Failed to delete the old cover image from the cloudinary ",
      error
    );
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Cover Image updated Succesfully"));
});

// In the below code we can fetch the information about our own channel or any other person channels also (based on the username we get in the url)
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(), //We use `.toLowerCase()` to make the search case-insensitive. So, "TechGuru" and "techguru" will both find the same user.
      },
    },
    // this stage will give the details of all the subscribers of (username)
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    // This stage will give the details of all the channels which (user has subscribed (whose username we have found from the url))
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        ChannelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // Project only the necessary data
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        ChannelsSubscribedToCount: 1,
        isSubscribed: 1,
        email: 1,
        subscribersCount : 1,
      },
    },
  ]);
  // The `aggregate` function always returns a list (an array). If the list is empty, no channel was found.
  if (!channel?.length) {
    throw new ApiError(404, "Channel not found");
  }

  return res.status(200).json(
    new ApiResponse(200, channel[0], "Channel profile fetched succesfully") //// We send the first (and only) item from the `channel` list. cahnnel[0]
  );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  // The Below written code will do a left outer join of User and videos and return whole thing for any perticular user
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id), // We cannot directly write req.user?._id because mongoose will treat it as a string and try to find the _id of this name , we have to pass the original id which is done be written code
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "WatchHistory",
      },
    },
  ]);
  // // The `aggregate` function always returns a list (an array). If the list is empty, no channel was found.
  if (!user?.length) {
    return new ApiError(400, "Failed to get the Users watch History Details");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.WatchHistory,
        "Watch History fetched succesfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  updateAvatar,
  updateAccountDetails,
  updatePassword,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  currentUser,
};
