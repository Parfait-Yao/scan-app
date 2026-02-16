// app/api/recup/route.ts (récupération des détails d'un produit par son barcode)
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get('barcode');

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode requis' }, { status: 400 });
  }

  try {
    const produit = await prisma.produit.findUnique({
      where: { barcode },
    });

    return NextResponse.json({ produit });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}