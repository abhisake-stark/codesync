import express, { Request, Response } from 'express';
import { Session } from '../models/Session';
import { protect } from '../middleware/auth';

const router = express.Router();

router.get('/:roomId', protect, async (req: Request, res: Response) => {
  try {
    const session = await Session.findOne({ roomId: req.params.roomId }).populate('roomId');
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session.toJSON());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

export default router;
