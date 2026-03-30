/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/inventaire/[id]/count/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  _: any,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const parsedId = Number(id);

  if (!id || isNaN(parsedId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const count = await prisma.inventaireItem.count({
    where: { inventaireId: parsedId },
  });

  return NextResponse.json({ count });
}