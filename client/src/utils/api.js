import { getAuth } from 'firebase/auth';

const getAuthHeaders = async () => {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('No user logged in');
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const uploadStatement = async (file, password) => {
  const formData = new FormData();
  formData.append('statementFile', file);
  if (password) {
    formData.append('password', password);
  }

  const headers = await getAuthHeaders();

  const response = await fetch('/api/upload-statement', {
    method: 'POST',
    headers: {
      ...headers,
      // Don't set Content-Type for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
};

export const getTransactions = async (filters = {}) => {
  const headers = await getAuthHeaders();
  const queryString = new URLSearchParams(filters).toString();

  const response = await fetch(`/api/transactions?${queryString}`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
};
