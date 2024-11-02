import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      // You might want to add categories like: food, transport, utilities, etc.
      default: 'uncategorized',
    },
    statement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Statement',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for common queries
transactionSchema.index({ date: 1, type: 1 });
transactionSchema.index({ category: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
