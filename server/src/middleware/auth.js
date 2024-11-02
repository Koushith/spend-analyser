import admin from 'firebase-admin';
import User from '../schema/user.js';

// Initialize Firebase Admin with your service account
// You'll need to add your service account credentials
admin.initializeApp({
  credential: admin.credential.cert({
    // Your Firebase service account details
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Find or create user in your database
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      // Get user details from Firebase
      const firebaseUser = await admin.auth().getUser(decodedToken.uid);

      // Create new user in your database
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};
