/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/inventaire/[id]/count/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(_: any, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

  const count = await prisma.inventaireItem.count({
    where: { inventaireId: id },
  });

  return NextResponse.json({ count });
}