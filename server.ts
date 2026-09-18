import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface StoredAuditRecord {
  id: string;
  name: string;
  company: string;
  website?: string;
  email: string;
  contactChannel: string;
  inquiryNotes?: string;
  createdAt: string;
  status: 'PENDING_REVIEW' | 'CONTACTED';
}

interface StoredContactRecord {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  status: 'NEW';
}

// In-memory record storage (ready to be plugged into a persistent DB / Webhook)
const auditSubmissions: StoredAuditRecord[] = [];
const contactSubmissions: StoredContactRecord[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'G-KAIS AI Business Systems API',
      timestamp: new Date().toISOString()
    });
  });

  // POST /api/audit - Real commercial audit request endpoint
  app.post('/api/audit', async (req, res) => {
    try {
      const { name, company, website, email, contactChannel, inquiryNotes } = req.body;

      // Validation
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Name is required.' });
      }
      if (!company || typeof company !== 'string' || !company.trim()) {
        return res.status(400).json({ success: false, error: 'Company name is required.' });
      }
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'A valid business email address is required.' });
      }

      // Generate verifiable server record ID
      const submissionId = `GK-AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const timestamp = new Date().toISOString();

      const record: StoredAuditRecord = {
        id: submissionId,
        name: name.trim(),
        company: company.trim(),
        website: website ? String(website).trim() : undefined,
        email: email.trim().toLowerCase(),
        contactChannel: contactChannel || 'Multiple channels',
        inquiryNotes: inquiryNotes ? String(inquiryNotes).trim() : undefined,
        createdAt: timestamp,
        status: 'PENDING_REVIEW'
      };

      auditSubmissions.push(record);

      console.log(`[AUDIT INTAKE] New verified submission [${submissionId}] for ${record.company} (${record.email})`);

      // Optional webhook notification forwarding
      if (process.env.NOTIFICATION_WEBHOOK_URL) {
        try {
          await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🔔 New G-KAIS Audit Request: ${record.company} (${record.name}) - Channel: ${record.contactChannel}`
            })
          });
        } catch (webhookErr) {
          console.error('[WEBHOOK ERROR] Failed to send external notification:', webhookErr);
        }
      }

      return res.status(200).json({
        success: true,
        submissionId,
        message: 'Your audit request has been registered. Our systems architecture team will review your lead flow.',
        timestamp
      });
    } catch (err) {
      console.error('[AUDIT ERROR]', err);
      return res.status(500).json({
        success: false,
        error: 'An internal error occurred while processing your audit request. Please try again.'
      });
    }
  });

  // POST /api/contact - General engineering contact endpoint
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, message } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Name is required.' });
      }
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'A valid email address is required.' });
      }
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Message content is required.' });
      }

      const submissionId = `GK-CNT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const timestamp = new Date().toISOString();

      const record: StoredContactRecord = {
        id: submissionId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
        createdAt: timestamp,
        status: 'NEW'
      };

      contactSubmissions.push(record);
      console.log(`[CONTACT INTAKE] New message [${submissionId}] from ${record.name} (${record.email})`);

      return res.status(200).json({
        success: true,
        submissionId,
        message: 'Inquiry received. Our systems team will get back to you shortly.',
        timestamp
      });
    } catch (err) {
      console.error('[CONTACT ERROR]', err);
      return res.status(500).json({
        success: false,
        error: 'An internal error occurred while processing your message. Please try again.'
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`G-KAIS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
