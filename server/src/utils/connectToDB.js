import mongoose from 'mongoose';

export const connectToDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to MongoDB: ${connection.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};
