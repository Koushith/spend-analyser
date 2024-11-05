// import UploadStatement from '@/components/UploadStatement';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { getGoogleBearerToken } from '@/utils/auth';

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      console.log('Invalid file - Please select a PDF file');
    }
  };

  const handleUpload = async () => {
    console.log('handleUpload started');
    if (!file) {
      console.log('No file selected');
      return;
    }

    try {
      setIsLoading(true);
      const token = await getGoogleBearerToken();
      console.log('Token:', token);

      if (!token) {
        console.log('Authentication required');
        return;
      }

      const formData = new FormData();
      formData.append('statementFile', file);
      if (password) {
        formData.append('password', password);
      }

      console.log('Sending request to server...');
      const response = await fetch('http://localhost:8000/api/upload-statement', {
        method: 'POST',
        headers: {
          Authorization: token,
        },
        body: formData,
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        console.error('Upload failed:', data.message || 'Failed to upload statement');
        return;
      }

      console.log('Upload successful:', data);
      console.log('Transaction count:', data.transactionCount);

      // Reset form
      setFile(null);
      setPassword('');
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    try {
      // Clear any auth tokens/state here
      localStorage.removeItem('googleAccessToken');
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <div className="flex justify-between items-center">
          <h1>Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        {/* <UploadStatement /> */}
        {/* Add other dashboard components here */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Upload Bank Statement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input type="file" accept=".pdf" onChange={handleFileChange} disabled={isLoading} />
              {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="PDF Password (if protected)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button onClick={handleUpload} disabled={!file || isLoading} className="w-full">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                  Uploading...
                </span>
              ) : (
                'Upload Statement'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
