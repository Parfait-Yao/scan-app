// app/api/inventaire/[id]/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  try {
    // Supprimer d'abord les items liés (pas de cascade dans le schéma)
    await prisma.inventaireItem.deleteMany({ where: { inventaireId: id } });

    // Supprimer ensuite l'inventaire
    await prisma.inventaire.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Inventaire #${id} supprimé avec succès`,
    });
  } catch (error) {
    console.error('Erreur suppression inventaire:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'inventaire' },
      { status: 500 }
    );
  }
}
