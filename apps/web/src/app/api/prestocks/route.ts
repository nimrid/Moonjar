import { NextResponse } from 'next/server';
import { PRESTOCKS_LIST, PRESTOCKS_API_URL } from '@moonjar/shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(PRESTOCKS_API_URL, {
      headers: {
        'User-Agent': 'MoonjarApp/1.0',
        'Accept': 'application/json',
      },
      next: { revalidate: 30 }, // cache for 30s
    });

    if (!res.ok) {
      return NextResponse.json({
        source: 'fallback',
        data: PRESTOCKS_LIST,
        warning: `Upstream returned status ${res.status}`,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      source: 'live',
      data,
    });
  } catch (error: any) {
    return NextResponse.json({
      source: 'fallback',
      data: PRESTOCKS_LIST,
      warning: error?.message || 'Network error fetching live prestocks',
    });
  }
}
