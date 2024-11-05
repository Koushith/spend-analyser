import { auth } from './firebase';

export const getGoogleBearerToken = async (): Promise<string | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    const token = await currentUser.getIdToken();
    return `Bearer ${token}`;
  } catch (error) {
    console.error('Error getting bearer token:', error);
    return null;
  }
};
