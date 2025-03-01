import express from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import pdf from 'pdf-parse';
import Statement from '../schema/statement.js';
import Transaction from '../schema/transaction.js';

const router = express.Router();

// Add this before your route handler to log incoming requests
const logRequest = (req, res, next) => {
  console.log('Incoming request headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Form field names:', Object.keys(req.body));
  next();
};

// Configure multer with more detailed options
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
}).fields([
  { name: 'statementFile', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'statement', maxCount: 1 }, // Add this to accept 'statement' field name
]);

// Modify the route to use the logger and handle Multer errors
router.post('/upload-statement', logRequest, (req, res) => {
  upload(req, res, function (err) {
    console.log('Files received:', req.files); // Log received files
    console.log('Raw request body:', req.body); // Add this line

    if (err instanceof multer.MulterError) {
      console.log('Multer error details:', {
        code: err.code,
        field: err.field,
        message: err.message,
        storageErrors: err.storageErrors,
      });
      return res.status(400).json({
        message: 'File upload error',
        error: err.message,
        details: {
          code: err.code,
          field: err.field,
        },
      });
    } else if (err) {
      return res.status(400).json({
        message: 'Error uploading file',
        error: err.message,
      });
    }

    // Get the file from either field name
    const uploadedFile = req.files?.statementFile?.[0] || req.files?.file?.[0] || req.files?.statement?.[0];
    if (!uploadedFile) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    req.file = uploadedFile; // Set the file for compatibility with existing code
    handleFileUpload(req, res);
  });
});

// Separate function to handle the file processing
async function handleFileUpload(req, res) {
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

    // Parse transactions from text content
    const parsedTransactions = parseTransactions(fullText);

    // Create new statement with user reference
    const statement = await Statement.create({
      fileName: req.file.originalname,
      startDate: parsedTransactions.startDate,
      endDate: parsedTransactions.endDate,
      uploadedBy: req.user._id,
    });

    // Create transactions with reference to statement
    const transactionsWithRef = parsedTransactions.transactions.map((transaction) => ({
      ...transaction,
      statement: statement._id,
    }));

    await Transaction.insertMany(transactionsWithRef);

    res.status(201).json({
      message: 'Statement uploaded and parsed successfully',
      statement,
      transactionCount: transactionsWithRef.length,
      transactions: transactionsWithRef,
    });
  } catch (error) {
    console.error('Upload statement error:', error);
    res.status(500).json({
      message: 'Error processing statement',
      error: error.message || error,
    });
  }
}

function parseTransactions(textContent) {
  const transactions = [];
  const lines = textContent.split('\n');

  let startDate = null;
  let endDate = null;

  // Log the first few lines to help with debugging
  console.log('First 10 lines of PDF content:');
  console.log(lines.slice(0, 10));

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Example pattern matching for a transaction line
    // You'll need to adjust this regex based on your bank statement format
    const transactionMatch = line.match(/(\d{2}[/-]\d{2}[/-]\d{4})\s+(.+?)\s+(CREDIT|DEBIT)\s+(\d+\.?\d*)/i);

    if (transactionMatch) {
      const [_, dateStr, description, type, amountStr] = transactionMatch;

      const date = new Date(dateStr);
      if (!startDate || date < startDate) startDate = date;
      if (!endDate || date > endDate) endDate = date;

      transactions.push({
        date,
        description: description.trim(),
        type: type.toLowerCase(),
        amount: parseFloat(amountStr),
        category: categorizeTransaction(description),
      });
    }
  }

  return {
    startDate: startDate || new Date(),
    endDate: endDate || new Date(),
    transactions,
  };
}

function categorizeTransaction(description) {
  description = description.toLowerCase();

  // Add your categorization rules here
  const categories = {
    transport: ['uber', 'ola', 'metro', 'bus', 'taxi'],
    food: ['swiggy', 'zomato', 'restaurant', 'food'],
    shopping: ['amazon', 'flipkart', 'myntra'],
    utilities: ['electricity', 'water', 'gas', 'internet', 'phone'],
    entertainment: ['netflix', 'amazon prime', 'spotify'],
    healthcare: ['hospital', 'medical', 'pharmacy'],
    // Add more categories as needed
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => description.includes(keyword))) {
      return category;
    }
  }

  return 'uncategorized';
}

// Get transactions with various filters
router.get('/transactions', async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query;
    const query = {
      'statement.uploadedBy': req.user._id, // Filter by user
    };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (type) query.type = type;
    if (category) query.category = category;

    const transactions = await Transaction.find(query).sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
});

// Get daily summary
router.get('/summary/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalCredit: {
            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] },
          },
          totalDebit: {
            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(summary);
  } catch (error) {
    console.error('Daily summary error:', error);
    res.status(500).json({ message: 'Error getting daily summary', error: error.message });
  }
});

// Get weekly summary
router.get('/summary/weekly', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $group: {
          _id: {
            $week: '$date',
          },
          startDate: { $min: '$date' },
          totalCredit: {
            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] },
          },
          totalDebit: {
            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { startDate: 1 } },
    ]);

    res.json(summary);
  } catch (error) {
    console.error('Weekly summary error:', error);
    res.status(500).json({ message: 'Error getting weekly summary', error: error.message });
  }
});

// Get monthly summary
router.get('/summary/monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const summary = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$date' },
          totalCredit: {
            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] },
          },
          totalDebit: {
            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(summary);
  } catch (error) {
    console.error('Monthly summary error:', error);
    res.status(500).json({ message: 'Error getting monthly summary', error: error.message });
  }
});

// Get category-wise spending
router.get('/summary/category', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
          type: 'debit', // Only consider expenses
        },
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    res.json(summary);
  } catch (error) {
    console.error('Category summary error:', error);
    res.status(500).json({ message: 'Error getting category summary', error: error.message });
  }
});

// Get current FY transactions
router.get('/summary/current-fy', async (req, res) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const fyStartMonth = 3; // April (0-based month)

    let fyStartDate, fyEndDate;

    if (today.getMonth() < fyStartMonth) {
      fyStartDate = new Date(currentYear - 1, fyStartMonth, 1);
      fyEndDate = new Date(currentYear, fyStartMonth, 0);
    } else {
      fyStartDate = new Date(currentYear, fyStartMonth, 1);
      fyEndDate = new Date(currentYear + 1, fyStartMonth, 0);
    }

    const summary = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: fyStartDate, $lte: fyEndDate },
        },
      },
      {
        $group: {
          _id: null,
          totalCredit: {
            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] },
          },
          totalDebit: {
            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      fyStartDate,
      fyEndDate,
      summary: summary[0],
    });
  } catch (error) {
    console.error('Current FY summary error:', error);
    res.status(500).json({ message: 'Error getting current FY summary', error: error.message });
  }
});

// Get last 3 FY comparison
router.get('/summary/last-3-fy', async (req, res) => {
  try {
    const today = new Date();
    const currentYear = today.getFullYear();
    const fyStartMonth = 3; // April (0-based month)

    let startYear = currentYear - 2;
    if (today.getMonth() < fyStartMonth) {
      startYear -= 1;
    }

    const summary = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(startYear, fyStartMonth, 1),
            $lte: new Date(currentYear, fyStartMonth, 0),
          },
        },
      },
      {
        $group: {
          _id: {
            fyYear: {
              $concat: [{ $toString: { $year: '$date' } }, '-', { $toString: { $add: [{ $year: '$date' }, 1] } }],
            },
          },
          totalCredit: {
            $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] },
          },
          totalDebit: {
            $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.fyYear': 1 } },
    ]);

    res.json(summary);
  } catch (error) {
    console.error('Last 3 FY comparison error:', error);
    res.status(500).json({ message: 'Error getting FY comparison', error: error.message });
  }
});

export default router;
