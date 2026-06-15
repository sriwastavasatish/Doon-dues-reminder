const mongoose = require('mongoose');

const scheduleSlotSchema = new mongoose.Schema({
  label:     { type: String, required: true },   // e.g. "Morning", "Afternoon"
  time:      { type: String, required: true },   // "HH:MM" 24hr format
  template:  { type: String, required: true },   // Message template with {placeholders}
  enabled:   { type: Boolean, default: true },
});

const runLogSchema = new mongoose.Schema({
  runAt:        { type: Date, default: Date.now },
  slot:         { type: String },
  totalSent:    { type: Number, default: 0 },
  totalFailed:  { type: Number, default: 0 },
  totalSkipped: { type: Number, default: 0 },
});

const campaignSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  description:    { type: String },
  status:         { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  targetClasses:  [{ type: String }],       // Which classes to target (empty = all)
  scheduleSlots:  [scheduleSlotSchema],     // Time slots with templates
  delayBetweenMessages: { type: Number, default: 30 },  // seconds
  messagesToSendPerDay: { type: Number, default: 3 },
  startDate:      { type: Date },
  endDate:        { type: Date },
  daysActive:     [{ type: String, enum: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] }],
  runLogs:        [runLogSchema],
  totalMessagesSent: { type: Number, default: 0 },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
