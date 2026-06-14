const schedule = require('node-schedule');
const Campaign = require('../models/Campaign');
const Student  = require('../models/Student');

const activeJobs = {};

function fillTemplate(tmpl, student) {
  const remaining = Math.max(0, (student.amountDue || 0) - (student.amountPaid || 0));
  return (tmpl || '')
    .replace(/{parent_name}/gi,  student.parentName  || 'Parent')
    .replace(/{student_name}/gi, student.studentName || 'Student')
    .replace(/{class}/gi,        student.className   || '')
    .replace(/{amount}/gi,       remaining.toLocaleString('en-IN'))
    .replace(/{due_since}/gi,    student.dueSince    || '');
}

function formatPhone(raw) {
  let p = (raw || '').replace(/\D/g, '');
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('91') && p.length === 10) p = '91' + p;
  return p;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runSlot(campaign, slot) {
  const query = { status: { $in: ['pending', 'partial'] } };
  if (campaign.targetClasses?.length) query.className = { $in: campaign.targetClasses };

  const students = await Student.find(query);
  const delay = (campaign.delayBetweenMessages || 30) * 1000;
  let sent = 0, failed = 0;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    try {
      const message = fillTemplate(slot.template, s);
      const phone   = formatPhone(s.phone);
      // Log the WhatsApp URL — frontend polls /api/campaigns/queue to open them
      await queueMessage(campaign._id, slot.label, phone, message);
      s.messageLogs.push({ slot: slot.label, campaign: campaign._id, status: 'sent' });
      await s.save({ validateBeforeSave: false });
      sent++;
    } catch (e) {
      failed++;
      console.error('Message error:', e.message);
    }
    if (i < students.length - 1) await sleep(delay);
  }

  await Campaign.findByIdAndUpdate(campaign._id, {
    $push: { runLogs: { runAt: new Date(), slot: slot.label, totalSent: sent, totalFailed: failed } },
    $inc:  { totalMessagesSent: sent }
  });

  console.log(`✅ [${campaign.name}] [${slot.label}] sent:${sent} failed:${failed}`);
}

// In-memory queue the frontend polls to open WhatsApp links
const _queue = [];
async function queueMessage(campaignId, slot, phone, message) {
  _queue.push({
    phone,
    message,
    waUrl: `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`,
    slot,
    campaignId: String(campaignId),
    queuedAt: new Date(),
  });
}
function drainQueue() { return _queue.splice(0, _queue.length); }

function scheduleNewCampaign(campaign) {
  if (!campaign || campaign.status !== 'active') return;
  cancelCampaign(String(campaign._id));

  const dayMap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  const jobs = [];

  for (const slot of (campaign.scheduleSlots || [])) {
    if (!slot.enabled) continue;
    const [hour, minute] = (slot.time || '09:00').split(':').map(Number);
    const days = campaign.daysActive?.length
      ? campaign.daysActive.map(d => dayMap[d]).filter(d => d !== undefined)
      : [0,1,2,3,4,5,6];

    const rule = new schedule.RecurrenceRule();
    rule.hour   = hour;
    rule.minute = minute;
    rule.dayOfWeek = days;

    const job = schedule.scheduleJob(rule, () => {
      runSlot(campaign, slot).catch(console.error);
    });
    if (job) {
      jobs.push(job);
      console.log(`📅 Scheduled [${campaign.name}] [${slot.label}] at ${slot.time} on days [${days}]`);
    }
  }
  activeJobs[String(campaign._id)] = jobs;
}

function cancelCampaign(id) {
  const jobs = activeJobs[String(id)];
  if (jobs?.length) { jobs.forEach(j => j?.cancel()); delete activeJobs[String(id)]; }
}

async function initScheduler() {
  try {
    const campaigns = await Campaign.find({ status: 'active' });
    campaigns.forEach(scheduleNewCampaign);
    console.log(`📅 Scheduler: loaded ${campaigns.length} active campaign(s)`);
  } catch (err) {
    console.error('Scheduler init error:', err.message);
  }
}

module.exports = { initScheduler, scheduleNewCampaign, cancelCampaign, drainQueue };
