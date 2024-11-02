const uploadStatement = async (file, password) => {
  const formData = new FormData();
  formData.append('statementFile', file);
  formData.append('password', password);

  try {
    const response = await fetch('/api/upload-statement', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message);
    }

    return data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
