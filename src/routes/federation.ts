import { Router, Response, Request } from 'express';
import { store } from '../db/store';
import { FederationPullResponse, FederationPushPayload } from '../../data_template/interfaces';

const router = Router();

// Simple shared secret for federation auth (can be improved with API keys)
const FEDERATION_SECRET = process.env.FEDERATION_SECRET || 'default_secret';

const federationAuth = (req: Request, res: Response, next: any) => {
  const secret = req.header('X-Federation-Secret');
  if (secret !== FEDERATION_SECRET) {
    return res.status(403).json({ error: 'Invalid federation secret' });
  }
  next();
};

router.post('/pull', federationAuth, (req: Request, res: Response) => {
  const entries = store.getAllBlocklist();
  const response: FederationPullResponse = {
    entries,
    hasMore: false
  };
  res.json(response);
});

router.post('/push', federationAuth, (req: Request, res: Response) => {
  const payload = req.body as FederationPushPayload;
  if (!payload.entries || !Array.isArray(payload.entries)) {
    return res.status(400).json({ error: 'Invalid push payload' });
  }

  payload.entries.forEach(entry => {
    store.upsertBlocklistEntry({
      ...entry,
      sourceId: payload.from
    });
  });

  res.json({ success: true });
});

export default router;
