const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  amount:   { type: Number, required: true },
  paidOn:   { type: Date, default: Date.now },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note:     { type: String, default: '' },
});

const messageLogSchema = new mongoose.Schema({
  sentAt:   { type: Date, default: Date.now },
  slot:     { type: String },
  status:   { type: String, enum: ['sent','failed','skipped'], default: 'sent' },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
});

const studentSchema = new mongoose.Schema({
  studentName:  { type: String, trim: true, default: '' },
  parentName:   { type: String, required: true, trim: true },
  phone:        { type: String, required: true },
  className:    { type: String, trim: true, default: '' },
  amountDue:    { type: Number, required: true, default: 0 },
  amountPaid:   { type: Number, default: 0 },
  dueSince:     { type: String, default: '' },
  status:       { type: String, enum: ['pending','paid','partial'], default: 'pending' },
  notes:        { type: String, default: '' },
  paymentHistory:   [paymentHistorySchema],
  messageLogs:      [messageLogSchema],
  assignedTeacher:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  importedFrom:     { type: String, default: '' },
  addedBy:          { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

studentSchema.virtual('remainingDue').get(function () {
  return Math.max(0, (this.amountDue || 0) - (this.amountPaid || 0));
});

studentSchema.set('toJSON',   { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Student', studentSchema);
