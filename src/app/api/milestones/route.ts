import { NextResponse } from 'next/server';
import { getMilestones, resetStore } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/milestones
 * Retrieves all escrow milestones for the dashboard.
 */
export async function GET() {
  try {
    const milestones = getMilestones();
    return NextResponse.json(milestones, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/milestones:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load milestones' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/milestones?action=reset
 * Resets the demo in-memory store back to pre-seeded state.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('action') === 'reset') {
      const milestones = resetStore();
      return NextResponse.json(milestones, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in POST /api/milestones:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process milestone request' },
      { status: 500 }
    );
  }
}
