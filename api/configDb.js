const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.mongoURI,);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectDb;
