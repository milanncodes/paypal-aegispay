import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 *
 * Health check probe reporting system readiness across the Policy Engine,
 * isolated AI Evaluator, PayPal Sandbox client, and AG Grid ledger.
 */
export async function GET() {
  const isAiLive = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
  const isPayPalConfigured = Boolean(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET &&
    process.env.PAYPAL_CLIENT_ID.trim() &&
    process.env.PAYPAL_CLIENT_SECRET.trim()
  );

  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.PAYPAL_MODE || 'sandbox',
      components: {
        frontend: 'operational',
        policyEngine: 'operational',
        aiEvaluator: isAiLive ? 'live_llm' : 'offline_fallback',
        paypalClient: isPayPalConfigured ? 'configured' : 'mock_sandbox',
        agGridLedger: 'operational',
      },
      version: '1.0.0',
    },
    { status: 200 }
  );
}
