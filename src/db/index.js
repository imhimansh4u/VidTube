// moto of this file is database connection
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"; // go one directory back
// always keep in mind that database is in another continent , so always try to use async , await
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );

    console.log(
      `\n MongoDB connected ! DB host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("mongoDB Connection error ", error);
    process.exit(1); // exits the code immediately .. 0-> means code succesful and 1-> means error happened
  }
};
export default connectDB;
