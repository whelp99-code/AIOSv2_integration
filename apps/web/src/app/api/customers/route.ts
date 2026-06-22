import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const dataPath = join(process.cwd(), 'src/data/customers.json');
    const raw = await readFile(dataPath, 'utf-8');
    const customers = JSON.parse(raw);
    return NextResponse.json({ customers, total: customers.length });
  } catch (error) {
    console.error('Customers API error:', error);
    return NextResponse.json(
      { customers: [], total: 0, error: '데이터를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}
