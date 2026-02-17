// app/api/recup/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imei = searchParams.get('imei');  // ← paramètre changé en imei

  if (!imei) {
    return NextResponse.json({ error: 'IMEI requis' }, { status: 400 });
  }

  try {
    // Recherche dans InventaireItem
    const item = await prisma.inventaireItem.findFirst({
      where: { imei },
      select: {
        imei: true,
        brand: true,
        model: true,
        capacity: true,
        color: true,
        revvoGrade: true,
        status: true,
        inventaireId: true,    // ← ajouté comme demandé
        createdAt: true,       // ← ajouté aussi (utile pour la date de scan)
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'IMEI non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ produit: item });
  } catch (error) {
    console.error('Erreur recup IMEI:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}