const ActivityLog = require('../models/ActivityLog');

exports.getLatest = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find()
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');
    res.json(logs);
  } catch (err) {
    next(err);
  }
};
