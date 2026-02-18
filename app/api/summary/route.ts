// app/api/summary/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type ItemSelected = {
  imei: string;
  brand: string;
  model: string;
  capacity: string;
  color: string;
  revvoGrade: string;
  status: string;
  createdAt: Date;
  quantite: number;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inventaireIdParam = searchParams.get("inventaireId");

    let inventaireId: number;

    if (inventaireIdParam) {
      inventaireId = Number(inventaireIdParam);
      if (isNaN(inventaireId)) {
        return NextResponse.json(
          { error: "ID inventaire invalide" },
          { status: 400 },
        );
      }
    } else {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const lastInventaire = await prisma.inventaire.findFirst({
        where: { date: { gte: todayStart } },
        orderBy: { createdAt: "desc" },
      });

      if (!lastInventaire) {
        return NextResponse.json(
          { error: "Aucun inventaire actif aujourd’hui" },
          { status: 404 },
        );
      }

      inventaireId = lastInventaire.id;
    }

    const items: ItemSelected[] = await prisma.inventaireItem.findMany({
      where: { inventaireId },
      select: {
        imei: true,
        brand: true,
        model: true,
        capacity: true,
        color: true,
        revvoGrade: true,
        status: true,
        createdAt: true,
        quantite: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (items.length === 0) {
      return NextResponse.json({
        produits: [],
        scans: [],
        grandTotalByGrade: { "A+": 0, A: 0, B: 0, C: 0, D: 0 },
        grandTotal: 0,
        date: new Date().toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        message: "Aucun appareil scanné dans cet inventaire",
        inventaireId,
      });
    }

    // Groupement
    const grouped = items.reduce(
      (
        acc: Record<
          string,
          {
            model: string;
            capacity: string;
            color: string;
            revvoGrade: string;
            quantiteTotale: number;
          }
        >,
        item,
      ) => {
        const key = `${item.model || "Inconnu"}-${item.capacity || "Inconnu"}-${item.color || "Inconnu"}-${item.revvoGrade || "Inconnu"}`;

        if (!acc[key]) {
          acc[key] = {
            model: item.model || "Inconnu",
            capacity: item.capacity || "Inconnu",
            color: item.color || "Inconnu",
            revvoGrade: item.revvoGrade || "Inconnu",
            quantiteTotale: 0,
          };
        }

        acc[key].quantiteTotale += item.quantite || 1;
        return acc;
      },
      {},
    );

    // Totaux par grade
    const grandTotalByGrade: Record<string, number> = {
      "A+": 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    };

    Object.values(grouped).forEach((group) => {
      const grade = group.revvoGrade;
      if (grade in grandTotalByGrade) {
        grandTotalByGrade[grade] += group.quantiteTotale;
      } else {
        grandTotalByGrade["Inconnu"] =
          (grandTotalByGrade["Inconnu"] || 0) + group.quantiteTotale;
      }
    });

    const grandTotal = Object.values(grandTotalByGrade).reduce(
      (sum, val) => sum + val,
      0,
    );

    // Liste détaillée pour Excel (ISO pour DateScan !)
    const itemsAvecDetails = items.map((item) => ({
      imei: item.imei || "N/A",
      brand: item.brand || "N/A",
      model: item.model || "N/A",
      capacity: item.capacity || "N/A",
      color: item.color || "N/A",
      revvoGrade: item.revvoGrade || "N/A",
      status: item.status || "N/A",
      quantite: item.quantite ?? 1,
      dateScan: item.createdAt.toISOString(),
    }));

    return NextResponse.json({
      produits: Object.values(grouped),
      scans: itemsAvecDetails,
      grandTotalByGrade,
      grandTotal,
      date: new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      inventaireId,
    });
  } catch (error) {
    console.error("Erreur summary:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
