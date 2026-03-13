import { Router, Response } from 'express';
import { store } from '../db/store';
import { reportService } from '../services/reportService';
import { AuthRequest } from '../middleware/auth';

const router = Router();

/** Refresh blocklist: re-run report-to-blocklist (promote/demote) for all reports. */
router.post('/refresh', (req: AuthRequest, res: Response) => {
  const processed = reportService.refreshBlocklist();
  res.json({ success: true, processed });
});

router.get('/', (req: AuthRequest, res: Response) => {
  const rateBasedOnly = req.query.rateBased === '1' || req.query.rateBased === 'true';
  const federated = store.getAllBlocklist();
  if (rateBasedOnly) {
    const blocklistKeys = new Set(federated.map((e) => `${e.number}|${e.type}`));
    const reported = store.getReportedNumberTypes();
    const fromReports = reported
      .filter((r) => !blocklistKeys.has(`${r.number}|${r.type}`))
      .map((r) => ({
        number: r.number,
        type: r.type as import('../../data_template/interfaces').BlockType,
        tier: 'default' as const,
        weight: 0,
        sourceId: 'reported',
        addedAt: 0,
      }));
    return res.json([...federated, ...fromReports]);
  }
  const personal = store.getPersonalBlocklist(req.deviceId!);
  const federatedNumbers = new Set(federated.map((e) => e.number));
  const merged = [...federated];
  personal.forEach((p) => {
    if (!federatedNumbers.has(p.number)) {
      merged.push({
        number: p.number,
        type: 'other',
        tier: 'personal',
        weight: 1,
        sourceId: 'personal',
        addedAt: p.added_at,
      });
    }
  });
  res.json(merged);
});

router.post('/personal', (req: AuthRequest, res: Response) => {
  const { number } = req.body;
  if (!number || typeof number !== 'string') {
    return res.status(400).json({ error: 'Number is required' });
  }
  const normalized = String(number).replace(/\D/g, '');
  if (normalized.length < 10) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }
  const fullNumber = normalized.length <= 10 ? `+1${normalized}` : `+${normalized}`;
  store.addPersonalBlock(req.deviceId!, fullNumber);
  res.json({ success: true, number: fullNumber });
});

router.delete('/personal/:number', (req: AuthRequest, res: Response) => {
  const raw = req.params.number;
  const number = Array.isArray(raw) ? raw[0] : raw;
  if (!number) {
    return res.status(400).json({ error: 'Number is required' });
  }
  const normalized = String(number).replace(/\D/g, '');
  const fullNumber = normalized.length <= 10 ? `+1${normalized}` : `+${normalized}`;
  store.removePersonalBlock(req.deviceId!, fullNumber);
  res.json({ success: true });
});

export default router;
