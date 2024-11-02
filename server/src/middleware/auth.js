import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../schema/user.js';
import { firebaseConfig } from '../utils/constatnts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

admin.initializeApp({
  projectId: firebaseConfig.projectId,
  // Optional: you can specify the auth emulator for local development
  // authEmulator: process.env.FIREBASE_AUTH_EMULATOR_HOST
});

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    const cachedUser = userCache.get(decodedToken.uid);
    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      const firebaseUser = await admin.auth().getUser(decodedToken.uid);
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });
    }

    userCache.set(decodedToken.uid, user);

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};
