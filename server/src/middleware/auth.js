import User from '../schema/user.js';
import { firebaseConfig } from '../utils/constatnts.js';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

// Initialize Firebase with client config
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // Use signInWithCustomToken instead of verifyToken
    const userCredential = await signInWithCustomToken(auth, token);
    const decodedToken = await userCredential.user.getIdTokenResult();

    let user = await User.findOne({ firebaseUid: userCredential.user.uid });

    if (!user) {
      user = await User.create({
        firebaseUid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};
