import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import pdf from 'pdf-parse';
import transactionRoutes from './routes/transaction.js';
import { connectToDB } from './utils/connectToDB.js';

dotenv.config();

const app = express();
const PORT = 8001;

// MongoDB connection
connectToDB();

// Middleware
app.use(cors());
app.use(express.json());

const upload = multer(); // Configure multer for file uploads

app.get('/', (req, res) => {
  res.send('Hello World');
});

// Routes
app.use('/api/transaction', transactionRoutes);

app.post('/upload-statement', upload.single('statementFile'), async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('File details:', req.file);

    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const password = req.body.password; // Get the password from the request body

    // Load the PDF document with the password
    const pdfDoc = await PDFDocument.load(req.file.buffer, { password });

    // Use pdf-parse to extract text from the uploaded PDF buffer
    const dataBuffer = req.file.buffer; // Use the buffer from the uploaded file
    const data = await pdf(dataBuffer); // Extract text using pdf-parse

    const fullText = data.text; // Get the extracted text

    // Log the first few lines to help with debugging
    console.log('First few lines of parsed text:');
    console.log(fullText.split('\n').slice(0, 5));

    // Respond with the extracted text
    res.status(200).json({
      message: 'PDF processed successfully',
      text: fullText,
    });
  } catch (error) {
    console.error('Upload statement error:', error);
    res.status(500).json({
      message: 'Error processing statement',
      error: error.message || error,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
