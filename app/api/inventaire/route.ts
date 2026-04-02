export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Si ton id Prisma est un Int autoincrement()
interface InventaireBase {
  id: number;
  date: Date;
  createdAt: Date;
  scanType: string;
}

interface InventaireResume extends InventaireBase {
  nbScans: number;
}

export async function GET() {
  try {
    const inventaires = await prisma.inventaire.findMany({
      select: {
        id: true,
        date: true,
        createdAt: true,
        scanType: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const inventairesAvecNbScans: InventaireResume[] = await Promise.all(
      inventaires.map(async (inv) => {
        const nbScans = await prisma.inventaireItem.count({
          where: {
            inventaireId: inv.id,
          },
        });

        return {
          id: inv.id,
          date: inv.date,
          createdAt: inv.createdAt,
          scanType: inv.scanType,
          nbScans,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      inventaires: inventairesAvecNbScans,
    });
  } catch (error: any) {
    console.error("Erreur liste inventaires complète :", error);
    console.error("Message :", error?.message);
    console.error("Stack :", error?.stack);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Erreur serveur lors de la récupération des inventaires",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    let scanType = "BARCODE";
    try {
      const body = await request.json();
      if (body.scanType) {
        scanType = body.scanType;
      }
    } catch (e) {
      // Body vide
    }

    const inventaire = await prisma.inventaire.create({
      data: {
        date: new Date(),
        scanType,
      },
    });

    return NextResponse.json({
      success: true,
      id: inventaire.id,
      date: inventaire.date,
      message: `Nouvel inventaire #${inventaire.id} créé`,
    });
  } catch (error: any) {
    console.error("Erreur création inventaire complète :", error);
    console.error("Message :", error?.message);
    console.error("Stack :", error?.stack);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erreur lors de la création de l’inventaire",
      },
      { status: 500 },
    );
  }
}
