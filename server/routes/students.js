const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Student = require('../models/Student');
const { protect, adminOnly } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET all students (teacher sees only their classes)
router.get('/', protect, async (req, res) => {
  try {
    const { status, className, search, page = 1, limit = 50 } = req.query;
    let query = {};
    if (req.user.role === 'teacher') query.className = { $in: req.user.assignedClasses };
    if (status)    query.status = status;
    if (className) query.className = className;
    if (search)    query.$or = [
      { studentName: new RegExp(search, 'i') },
      { parentName:  new RegExp(search, 'i') },
      { phone:       new RegExp(search, 'i') },
    ];
    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('assignedTeacher', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ students, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST import from Excel
router.post('/import', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    if (!data.length) return res.status(400).json({ message: 'Excel file is empty' });

    // Flexible column mapping
    const map = (row, keys) => {
      for (const k of keys) {
        const found = Object.keys(row).find(h => h.toLowerCase().replace(/\s+/g,'').includes(k));
        if (found) return String(row[found] || '').trim();
      }
      return '';
    };

    const students = [];
    const errors = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const parentName  = map(row, ['parentname','parent','fathername','guardian']);
      const phone       = map(row, ['phone','mobile','whatsapp','contact']).replace(/\D/g,'');
      const studentName = map(row, ['studentname','student','childname','name']);
      const className   = map(row, ['class','grade','section','std']);
      const amountDue   = parseFloat(map(row, ['amountdue','amount','dues','fees','pending','balance'])) || 0;
      const dueSince    = map(row, ['duesince','since','pendingsince','month']);
      const notes       = map(row, ['notes','note','remarks','comment']);

      if (!parentName || !phone || amountDue <= 0) {
        errors.push(`Row ${i+2}: Missing parent name, phone, or amount`);
        continue;
      }
      students.push({ parentName, phone, studentName, className, amountDue, dueSince, notes, addedBy: req.user._id, importedFrom: req.file.originalname });
    }

    // Upsert by phone number
    let inserted = 0, updated = 0;
    for (const s of students) {
      const existing = await Student.findOne({ phone: s.phone });
      if (existing) {
        await Student.findByIdAndUpdate(existing._id, { ...s, status: s.amountDue > 0 ? 'pending' : 'paid' });
        updated++;
      } else {
        await Student.create(s);
        inserted++;
      }
    }

    res.json({ message: `Import done: ${inserted} added, ${updated} updated`, errors, inserted, updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH mark as paid
router.patch('/:id/pay', protect, async (req, res) => {
  try {
    const { amountPaid, note } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const paid = parseFloat(amountPaid) || student.remainingDue;
    student.amountPaid += paid;
    student.paymentHistory.push({ amount: paid, markedBy: req.user._id, note });
    student.status = student.amountPaid >= student.amountDue ? 'paid' : 'partial';
    await student.save();
    res.json({ student, message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update student
router.put('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ student });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE student (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET stats for dashboard
router.get('/stats/summary', protect, async (req, res) => {
  try {
    let match = {};
    if (req.user.role === 'teacher') match.className = { $in: req.user.assignedClasses };

    const [totals] = await Student.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        totalStudents:  { $sum: 1 },
        totalDue:       { $sum: '$amountDue' },
        totalPaid:      { $sum: '$amountPaid' },
        pendingCount:   { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        paidCount:      { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        partialCount:   { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
      }}
    ]);

    const byClass = await Student.aggregate([
      { $match: match },
      { $group: {
        _id: '$className',
        due: { $sum: '$amountDue' },
        paid: { $sum: '$amountPaid' },
        count: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
      }},
      { $sort: { due: -1 } }
    ]);

    // Monthly payment trend (last 6 months)
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await Student.aggregate([
      { $match: match },
      { $unwind: '$paymentHistory' },
      { $match: { 'paymentHistory.paidOn': { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$paymentHistory.paidOn' }, month: { $month: '$paymentHistory.paidOn' } },
        total: { $sum: '$paymentHistory.amount' },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({ totals: totals || {}, byClass, monthlyTrend });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
