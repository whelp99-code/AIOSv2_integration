import { NextRequest, NextResponse } from 'next/server';

const CFO_BASE = process.env.CFO_AIOS_URL ?? 'http://localhost:4100';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await params);
}

async function proxy(
  request: NextRequest,
  params: { path: string[] },
) {
  const path = params.path?.join('/') ?? '';
  const url = new URL(request.url);
  const target = `${CFO_BASE}/api/${path}${url.search}`;

  try {
    const init: RequestInit = {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('content-type') ?? 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = await request.text();
    }

    const res = await fetch(target, init);
    const body = await res.text();

    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (error) {
    console.error('CFO proxy error:', error);
    return NextResponse.json(
      { error: 'CFO 서비스에 연결할 수 없습니다.', path },
      { status: 502 },
    );
  }
}
