// Reine Entscheidungslogik für onPlanPublished (ohne Firebase-Abhängigkeit, testbar).
// Nur ein neuer publishedAt-Stand eines Coach-Plans löst einen Push aus.
function shouldNotifyPlanPublished(uid, before, after) {
  if (!after || after.status !== "published" || !after.publishedAt) return false;
  if (after.publishedAt === (before || {}).publishedAt) return false;
  return Boolean(after.coachUid) && after.coachUid !== uid;
}

module.exports = { shouldNotifyPlanPublished };
