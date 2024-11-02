import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    displayName: String,
    photoURL: String,
    // Add any additional fields you want to store
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
