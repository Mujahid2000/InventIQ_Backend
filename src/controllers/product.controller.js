const Product = require('../models/Product');
const RestockQueue = require('../models/RestockQueue');
const ActivityLog = require('../models/ActivityLog');

exports.getAll = async (req, res, next) => {
  try {
    const products = await Product.find().populate('category');
    res.json(products);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('category');
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
};

async function postSaveChecks(product, req) {
  if (product.stockQuantity === 0) {
    product.status = 'Out of Stock';
  } else {
    product.status = 'In Stock';
  }

  if (product.stockQuantity < product.minStockThreshold) {
    // add to restock queue if not already present
    const exists = await RestockQueue.findOne({ product: product._id, status: 'pending' });
    if (!exists) {
      await RestockQueue.create({ product: product._id });
      await ActivityLog.create({
        action: `Product "${product.name}" added to Restock Queue (stock: ${product.stockQuantity}, threshold: ${product.minStockThreshold})`,
        performedBy: req.user._id
      });
    }
  }
}

exports.create = async (req, res, next) => {
  try {
    const data = req.body;
    let product = new Product(data);

    await postSaveChecks(product, req);
    product = await product.save();

    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'create_product',
      entityType: 'Product',
      entityId: product._id,
      details: { name: product.name },
    });

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    let product = await Product.findById(id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    Object.assign(product, data);

    await postSaveChecks(product, req);
    product = await product.save();

    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'update_product',
      entityType: 'Product',
      entityId: product._id,
      details: { name: product.name },
    });

    res.json(product);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    await product.remove();

    await ActivityLog.create({
      user: req.user ? req.user._id : undefined,
      action: 'delete_product',
      entityType: 'Product',
      entityId: product._id,
      details: { name: product.name },
    });

    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
};
