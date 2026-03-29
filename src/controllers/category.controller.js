const Category = require('../models/Category');
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');

exports.getAll = async (req, res, next) => {
  try {
    const [categories, groupedCounts] = await Promise.all([
      Category.find().sort('name').lean(),
      Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    ]);

    const countMap = new Map(
      groupedCounts.map((item) => [String(item._id), item.count])
    );

    const enriched = categories.map((category) => ({
      ...category,
      productCount: countMap.get(String(category._id)) || 0,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, iconColor } = req.body;
    if (!name) {
      res.status(400);
      return next(new Error('Name is required'));
    }

    const category = await Category.create({
      name,
      description,
      iconColor,
    });

    // Log activity
    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'create_category',
      entityType: 'Category',
      entityId: category._id,
      details: { name: category.name },
    });

    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, iconColor } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      res.status(404);
      return next(new Error('Category not found'));
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (iconColor !== undefined) category.iconColor = iconColor;

    await category.save();

    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'update_category',
      entityType: 'Category',
      entityId: category._id,
      details: { name: category.name },
    });

    res.json(category);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cat = await Category.findById(id);
    if (!cat) {
      res.status(404);
      return next(new Error('Category not found'));
    }

    await cat.remove();

    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'delete_category',
      entityType: 'Category',
      entityId: cat._id,
      details: { name: cat.name },
    });

    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};
