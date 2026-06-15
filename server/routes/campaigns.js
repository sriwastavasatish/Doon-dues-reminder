const router   = require('express').Router();
const Campaign = require('../models/Campaign');
const Student  = require('../models/Student');
const { protect, adminOnly } = require('../middleware/auth');
const { scheduleNewCampaign, cancelCampaign, drainQueue } = require('../utils/scheduler');

// ── helpers ──────────────────────────────────────────────────────────────────
function fillTemplate(tmpl, student) {
  const remaining = Math.max(0, (student.amountDue||0) - (student.amountPaid||0));
  return (tmpl||'')
    .replace(/{parent_name}/gi,  student.parentName  || 'Parent')
    .replace(/{student_name}/gi, student.studentName || 'Student')
    .replace(/{class}/gi,        student.className   || '')
    .replace(/{amount}/gi,       remaining.toLocaleString('en-IN'))
    .replace(/{due_since}/gi,    student.dueSince    || '');
}

// ── routes ───────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ campaigns });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const campaign = await Campaign.create({ ...req.body, createdBy: req.user._id });
    scheduleNewCampaign(campaign);
    res.status(201).json({ campaign });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    cancelCampaign(req.params.id);
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (campaign.status === 'active') scheduleNewCampaign(campaign);
    res.json({ campaign });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    cancelCampaign(req.params.id);
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Preview messages for a campaign
router.get('/:id/preview', protect, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Not found' });
    const students = await Student.find({ status: { $in: ['pending','partial'] } }).limit(3);
    const previews = students.map(s => ({
      student: { name: s.studentName, parent: s.parentName, class: s.className },
      messages: campaign.scheduleSlots.map(slot => ({
        label:   slot.label,
        time:    slot.time,
        message: fillTemplate(slot.template, s),
      }))
    }));
    res.json({ previews });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Frontend polls this to pick up queued WhatsApp links
router.get('/queue/drain', protect, (req, res) => {
  res.json({ items: drainQueue() });
});

module.exports = router;
