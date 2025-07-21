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
    // 👇 THIS IS THE CRUCIAL CHANGE 👇
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

  // if (!avatarLocalPath) {
  //   throw new ApiError(400, "Avatar file is missing");
  // }

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

export { registerUser, loginUser, refreshAccessToken, logoutUser };
