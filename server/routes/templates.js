const router = require('express').Router();
const { protect } = require('../middleware/auth');

// Built-in templates (can be extended to DB)
const builtinTemplates = [
  {
    id: 'humble-hindi',
    name: 'Humble Hindi (Morning)',
    template: `🙏 Namaskar {parent_name} Ji,\n\nAapko vinmra nivedan hai ki aapke bachhe *{student_name}* ({class}) ki school fees mein *₹{amount}* abhi baki hai.\n\nKripaya aaj school mein fees jama karva dein.\n\nDhanyavaad 🙏\n— Doon Dues Reminder`
  },
  {
    id: 'urgent-english',
    name: 'Urgent English (Afternoon)',
    template: `Dear {parent_name} Ji,\n\nThis is a gentle reminder that *₹{amount}* in school fees for *{student_name}* ({class}) remains unpaid.\n\n⚠️ Kindly clear the dues at the earliest to avoid any inconvenience.\n\nThank you,\nSchool Office 📚`
  },
  {
    id: 'final-evening',
    name: 'Final Reminder (Evening)',
    template: `🔔 Respected {parent_name} Ji,\n\nWe urge you to please clear the pending school fees of *₹{amount}* for *{student_name}* ({class}) as soon as possible.\n\nContinued non-payment may affect your child's records. We value your cooperation. 🙏\n\n— School Management`
  },
  {
    id: 'friendly',
    name: 'Friendly Reminder',
    template: `Hi {parent_name} Ji! 😊\n\nJust a friendly reminder that school fees of *₹{amount}* for *{student_name}* are due.\n\nPlease clear at your convenience. Thank you! 🙏`
  },
];

router.get('/', protect, (req, res) => res.json({ templates: builtinTemplates }));

module.exports = router;
