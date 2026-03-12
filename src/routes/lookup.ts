import { Router, Response } from 'express';
import { store } from '../db/store';
import { AuthRequest } from '../middleware/auth';
import { BlockLookupResult } from '../../data_template/interfaces';

const router = Router();

router.get('/:number', (req: AuthRequest, res: Response) => {
  const rawNumber = req.params.number;
  const number = Array.isArray(rawNumber) ? rawNumber[0] : rawNumber;
  if (!number) {
    return res.status(400).json({ error: 'Missing number' });
  }
  const entries = store.getBlocklistEntry(number);

  const result: BlockLookupResult = {
    blocked: entries.length > 0,
    number,
    types: entries.length > 0 ? entries.map(e => e.type) : undefined,
    confidence: entries.length > 0 ? Math.max(...entries.map(e => e.weight || 0)) : undefined
  };

  res.json(result);
});

export default router;
