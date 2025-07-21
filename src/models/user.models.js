import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"; //A library to help you hash passwords.
import jwt from "jsonwebtoken";

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fullname: {
      type: String,
      required: true,
      unique: false,
      lowercase: false,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // Cloudnary URL
      required: true,
    },
    coverImage: {
      type: String,
      required: false,
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId, // ObjectId of video from the Video model or schema
        ref: "Video", // Here you will tell that from which model you are refering ,( exact name of that model in this string)
      },
    ],
    password: {
      type: String,
      required: [true, "password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true } // THis is very common practice in mongoose , this field automatically gives us two things->> createdAt and UpdatedAt ///
);

UserSchema.pre("save", async function (next) {
  // we are using here (pre) hook, means just before saving the password in tha database , just encrypt it

  if (!this.isModified("password")) {
    // it means that if we are not modifieng password then return from this function , means we have to only modify and encrypt the password not other things like username and other things
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10); // encrypting the password (10: This is called the salt rounds. More rounds = more secure but slower. 10 is standard.)

  next();
});
// The below defined function is to check that , the password provided by the user and the password saved into the database is same or not , if it is same , it returns true otherwise returns false ..
UserSchema.methods.isPasswordCorrect = async function (password) {
  // Note:-> the password in database is saved in encrypted form , so the plugin (bcrypt) decrypt it and then compare it with the users given password through the compare function
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = async function () {
  // short lived access token
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET, // It is a secret string (random characters) that is used to digitally sign and verify your JWT tokens.
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY_TIME }
  );
};
// Now refresh tokens
UserSchema.methods.generateRefreshToken = async function () {
  // short lived access token
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY_TIME }
  );
};

export const User = mongoose.model("User", UserSchema);

// STUDY NOTES
// mongodb always adds an _id field to each model automatically , so never focus on that thing
