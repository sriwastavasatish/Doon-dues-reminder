const router = require('express').Router();
const Student = require('../models/Student');
const Campaign = require('../models/Campaign');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const match = isAdmin ? {} : { className: { $in: req.user.assignedClasses } };

    const [stats] = await Student.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        total:         { $sum: 1 },
        totalDue:      { $sum: '$amountDue' },
        totalCollected:{ $sum: '$amountPaid' },
        pendingCount:  { $sum: { $cond: [{ $eq: ['$status','pending'] },1,0] } },
        paidCount:     { $sum: { $cond: [{ $eq: ['$status','paid'] },1,0] } },
        partialCount:  { $sum: { $cond: [{ $eq: ['$status','partial'] },1,0] } },
      }}
    ]);

    const byClass = await Student.aggregate([
      { $match: match },
      { $group: {
        _id: '$className',
        totalDue: { $sum: '$amountDue' },
        totalPaid: { $sum: '$amountPaid' },
        count: { $sum: 1 },
        paidCount: { $sum: { $cond: [{ $eq: ['$status','paid'] }, 1, 0] } },
      }},
      { $sort: { totalDue: -1 } },
      { $limit: 10 }
    ]);

    // Last 7 days payments
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentPayments = await Student.aggregate([
      { $match: match },
      { $unwind: '$paymentHistory' },
      { $match: { 'paymentHistory.paidOn': { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentHistory.paidOn' } },
        amount: { $sum: '$paymentHistory.amount' },
        count: { $sum: 1 },
      }},
      { $sort: { '_id': 1 } }
    ]);

    // Monthly trend (6 months)
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await Student.aggregate([
      { $match: match },
      { $unwind: '$paymentHistory' },
      { $match: { 'paymentHistory.paidOn': { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { y: { $year: '$paymentHistory.paidOn' }, m: { $month: '$paymentHistory.paidOn' } },
        total: { $sum: '$paymentHistory.amount' },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]);

    const recentStudents = await Student.find({ ...match, 'paymentHistory.0': { $exists: true } })
      .sort({ updatedAt: -1 }).limit(5).select('studentName parentName className amountPaid status');

    const activeCampaigns = isAdmin ? await Campaign.find({ status: 'active' }).countDocuments() : 0;

    res.json({ stats: stats || {}, byClass, recentPayments, monthlyTrend, recentStudents, activeCampaigns });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
