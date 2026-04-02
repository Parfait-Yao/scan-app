import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInventoryCompletedEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inventaireId = body?.inventaireId;

    // 1. Validation
    if (!inventaireId || typeof inventaireId !== 'number') {
      return NextResponse.json(
        { error: 'inventaireId invalide ou manquant' },
        { status: 400 }
      );
    }

    // 2. Récupérer inventaire + items
    const inventaire = await prisma.inventaire.findUnique({
      where: { id: inventaireId },
      include: { inventaireItems: true },
    });

    if (!inventaire) {
      return NextResponse.json(
        { error: 'Inventaire non trouvé' },
        { status: 404 }
      );
    }

    // 3. Empêcher double traitement
    if (inventaire.status === 'COMPLETED') {
      return NextResponse.json({
        message: 'Inventaire déjà terminé',
      });
    }

    // 4. Mettre à jour statut
    const updated = await prisma.inventaire.update({
      where: { id: inventaireId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: { inventaireItems: true },
    });

    // 5. Définir les destinataires (3 emails)
    const recipients = [
      'parfait@revvo.africa',
      'galliam@revvo.africa',
      'christian@revvo.africa'
    ];

    console.log('📧 Envoi email à :', recipients);

    // 6. Envoyer email
    await sendInventoryCompletedEmail({
      to: recipients,
      inventaireId: updated.id,
      itemsCount: updated.inventaireItems.length,
    });

    // 7. Marquer notification envoyée (anti doublon)
    await prisma.inventaire.update({
      where: { id: inventaireId },
      data: {
        notificationSent: true,
      },
    });

    return NextResponse.json({
      message: 'Inventaire terminé et email envoyé',
      data: updated,
    });

  } catch (error) {
    console.error('❌ Erreur API complete:', error);

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}