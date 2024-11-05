import { useState } from 'react';

interface UploadResponse {
  statement: {
    _id: string;
    fileName: string;
    startDate: string;
    endDate: string;
  };
  transactionCount: number;
  transactions: Array<{
    date: string;
    description: string;
    type: 'credit' | 'debit';
    amount: number;
    category: string;
  }>;
}

export function useStatementUpload() {
  const [isLoading, setIsLoading] = useState(false);

  const uploadStatement = async (file: File, password?: string) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('statementFile', file);
      if (password) {
        formData.append('password', password);
      }

      const response = await fetch('/api/upload-statement', {
        method: 'POST',
        body: formData,
      });

      const data: UploadResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.statement.fileName || 'Failed to upload statement');
      }

      console.log(data);

      return data;
    } catch (error) {
      console.error('Upload failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    uploadStatement,
  };
}
