import type { Express, Request, Response } from 'express';
import { verifyWorkspaceBearerToken } from '../auth/workspaceAuth';
import {
  analyzeLeadWithGemini,
  sanitizeLeadIntelligenceInput
} from '../services/leadIntelligence';

async function sessionBriefHandler(req: Request, res: Response) {
  try {
    const identity = await verifyWorkspaceBearerToken(
      req.headers.authorization,
      'mentoring.read'
    );

    if (!identity) {
      return res.status(403).json({
        success: false,
        code: 'WORKSPACE_FORBIDDEN',
        error: 'Active Workspace membership with mentoring access is required.'
      });
    }

    const input = sanitizeLeadIntelligenceInput(req.body);
    if (!input) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Session context is incomplete or invalid.'
      });
    }

    const brief = await analyzeLeadWithGemini(input);
    console.info(
      `[WORKSPACE SESSION AI] Workspace ${identity.workspaceId} member ${identity.uid} analyzed client ${input.id}`
    );

    return res.status(200).json({
      success: true,
      code: 'SESSION_BRIEF_READY',
      brief
    });
  } catch (err: unknown) {
    console.error('[WORKSPACE SESSION AI ERROR]', err);
    const missingApiKey = err instanceof Error && err.message === 'Gemini API key is not configured.';
    const unavailableAuth = err instanceof Error && /credential|firestore|project/i.test(err.message);

    return res.status(missingApiKey || unavailableAuth ? 503 : 502).json({
      success: false,
      code: missingApiKey ? 'AI_NOT_CONFIGURED' : unavailableAuth ? 'WORKSPACE_AUTH_UNAVAILABLE' : 'AI_PROVIDER_ERROR',
      error: missingApiKey
        ? 'G-KAIS AI is not configured in this environment.'
        : unavailableAuth
          ? 'Workspace authorization is temporarily unavailable.'
          : err instanceof Error ? err.message : 'G-KAIS could not prepare the session brief.'
    });
  }
}

export function registerWorkspaceAiRoutes(app: Express): void {
  app.post('/api/workspace/ai/session-brief', sessionBriefHandler);

  // Compatibility alias for the current Session Copilot client. This route is
  // registered before the legacy admin-only handler in server.ts, so session
  // Copilot requests use Workspace membership/permissions without broadening
  // any admin email endpoint.
  app.post('/api/admin/ai/lead-brief', sessionBriefHandler);
}
