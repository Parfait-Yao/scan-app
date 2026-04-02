/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/inventaire/[id]/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const inventaireId = Number(id);

    if (isNaN(inventaireId) || inventaireId <= 0) {
      return NextResponse.json(
        { error: 'ID inventaire invalide' },
        { status: 400 }
      );
    }

    // Vérifier que l'inventaire existe
    const inventaire = await prisma.inventaire.findUnique({
      where: { id: inventaireId },
    });

    if (!inventaire) {
      return NextResponse.json(
        { error: `Inventaire #${inventaireId} introuvable` },
        { status: 404 }
      );
    }

    // Supprimer d'abord les items (cascade manuelle si pas configurée dans le schema)
    await prisma.inventaireItem.deleteMany({
      where: { inventaireId },
    });

    // Puis supprimer l'inventaire lui-même
    await prisma.inventaire.delete({
      where: { id: inventaireId },
    });

    return NextResponse.json({
      success: true,
      message: `Inventaire #${inventaireId} et ses scans ont été supprimés`,
    });
  } catch (error: any) {
    console.error('Erreur suppression inventaire:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression' },
      { status: 500 }
    );
  }
}
