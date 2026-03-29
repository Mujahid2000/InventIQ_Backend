const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'changeme',
    { expiresIn: '7d' }
  );
};

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      res.status(400);
      return next(new Error('Email and password required'));
    }

    const exists = await User.findOne({ email });
    if (exists) {
      res.status(400);
      return next(new Error('User already exists'));
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashed });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    // Demo login support: send { demo: true } in request body
    if (req.body && req.body.demo) {
      const demoEmail = 'demo@test.com';
      const demoPass = 'demo123';

      let demoUser = await User.findOne({ email: demoEmail });
      if (!demoUser) {
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(demoPass, salt);
        demoUser = await User.create({ name: 'Demo User', email: demoEmail, password: hashed });
      }

      const token = generateToken(demoUser);
      return res.json({
        token,
        user: {
          id: demoUser._id,
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role,
        },
      });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400);
      return next(new Error('Email and password required'));
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401);
      return next(new Error('Invalid credentials'));
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401);
      return next(new Error('Invalid credentials'));
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};
