import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useToast } from '@/hooks/use-toast';

export default function UploadStatement() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: 'Please select a PDF file',
      });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a PDF file to upload',
      });
      return;
    }

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload statement');
      }

      toast({
        title: 'Success',
        description: `Uploaded ${data.transactionCount} transactions`,
      });

      // Reset form
      setFile(null);
      setPassword('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload statement',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
  );
}
