import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { protect } from '../middleware/auth';

const router = express.Router();

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecret', {
    expiresIn: '30d',
  });
};

router.post('/signup', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    passwordHash
  });

  if (user) {
    res.status(201).json({
      user: user.toJSON(),
      token: generateToken(user._id.toString()),
    });
  } else {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.passwordHash))) {
    res.json({
      user: user.toJSON(),
      token: generateToken(user._id.toString()),
    });
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

router.get('/me', protect, async (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
