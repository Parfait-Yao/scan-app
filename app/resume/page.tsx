/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FaTableCells } from "react-icons/fa6";
import { BsUpcScan } from "react-icons/bs";
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

// shadcn imports
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Interfaces
interface GroupedProduit {
  model: string;
  capacity: string;
  color: string;
  revvoGrade: string;
  quantiteTotale: number;
}

interface InventaireItem {
  imei: string;
  brand: string;
  model: string;
  capacity: string;
  color: string;
  revvoGrade: string;
  status: string;
  quantite: number;
  dateScan: string;
}

interface SummaryResponse {
  produits: GroupedProduit[];
  scans: InventaireItem[];
  grandTotalByGrade: Record<string, number>;
  grandTotal: number;
  date: string;
  inventaireId?: number;
}

function ResumeContent() {
  const searchParams = useSearchParams();
  const inventaireId = searchParams.get('inventaireId');

  const [inventaire, setInventaire] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        let url = '/api/summary';
        if (inventaireId) url += `?inventaireId=${inventaireId}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if ('error' in json) throw new Error(json.error);

        setInventaire(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, [inventaireId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl">Chargement...</div>;
  }

  if (error || !inventaire) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-5xl font-bold text-red-500 mb-6">Oups !</h1>
          <p className="text-2xl mb-8">{error || 'Aucun appareil scanné'}</p>
          <Link href="/scan" className="bg-emerald-600 px-10 py-5 rounded-xl text-white font-bold">
            Retour au scanner
          </Link>
        </div>
      </div>
    );
  }

  const produits = inventaire.produits || [];
  const scans = inventaire.scans || [];
  const date = inventaire.date || new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const grandTotalByGrade = inventaire.grandTotalByGrade || {};
  const totalGeneral = inventaire.grandTotal || 0;
  

  const downloadPDF = () => {
  const doc = new jsPDF('landscape');

  doc.setFontSize(16);
  doc.text(`Résumé Inventaire #${inventaireId || 'Actuel'}`, 14, 15);

  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(date, 14, 22);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Totaux par grade :', 14, 32);

  let y = 40; // on commence plus haut pour les totaux
  ['A+', 'A', 'B', 'C', 'D'].forEach(grade => {
    doc.text(`${grade} : ${grandTotalByGrade[grade] || 0}`, 14, y);
    y += 7; // espace entre chaque ligne de grade
  });

  doc.setFontSize(12);
  doc.text(`Total général : ${totalGeneral}`, 14, y + 8); // espace supplémentaire après les totaux

  if (produits.length > 0) {
    const tableColumn = [
      'Modèle', 'Capacité', 'Couleur',
      'A+', 'A', 'B', 'C', 'D', 'Total'
    ];

    const tableRows = produits.map(p => [
      p.model || 'N/A',
      p.capacity || 'N/A',
      p.color || 'N/A',
      p.revvoGrade === 'A+' ? p.quantiteTotale : '',
      p.revvoGrade === 'A' ? p.quantiteTotale : '',
      p.revvoGrade === 'B' ? p.quantiteTotale : '',
      p.revvoGrade === 'C' ? p.quantiteTotale : '',
      p.revvoGrade === 'D' ? p.quantiteTotale : '',
      p.quantiteTotale,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: y + 18,           // ← ESPACEMENT AUGMENTÉ : 18 unités après le dernier total
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 10 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { top: 10, left: 10, right: 10, bottom: 15 }, // marges plus équilibrées
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 15 },
        7: { cellWidth: 15 },
        8: { cellWidth: 20 },
      },
    });
  }

  const pageCount = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${i}/${pageCount}`, 14, doc.internal.pageSize.height - 10);
  }

  doc.save(`Inventaire_${inventaireId || 'Actuel'}_${new Date().toISOString().split('T')[0]}.pdf`);
};


  // Excel détaillé par IMEI
  // const downloadExcel = () => {
  //   if (scans.length === 0) return toast.error('Aucun scan à exporter');

  //   const excelData = scans.map(s => ({
  //     IMEI: s.imei,
  //     Marque: s.brand || '',
  //     Modèle: s.model || '',
  //     Capacité: s.capacity || '',
  //     Couleur: s.color || '',
  //     Grade: s.revvoGrade || '',
  //     Statut: s.status || '',
  //     Quantité: s.quantite,
  //     DateScan: new Date(s.dateScan).toLocaleString('fr-FR'),
  //   }));

  //   const ws = XLSX.utils.json_to_sheet(excelData);
  //   const wb = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(wb, ws, 'Scans');
  //   XLSX.writeFile(wb, `Scans_${inventaireId || 'Actuel'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  // };
  const downloadExcel = () => {
  if (scans.length === 0) {
    return toast.error('Aucun scan à exporter');
  }

  const excelData = scans.map(s => {
    let dateScanFormatted = 'N/A';
    try {
      const dateObj = new Date(s.dateScan);
      if (!isNaN(dateObj.getTime())) {
        dateScanFormatted = dateObj.toLocaleString('fr-FR');
      }
    } catch (e) {
      // silencieux
    }

    return {
      IMEI: s.imei || 'N/A',
      Marque: s.brand || 'N/A',
      Modèle: s.model || 'N/A',
      Capacité: s.capacity || 'N/A',
      Couleur: s.color || 'N/A',
      Grade: s.revvoGrade || 'N/A',
      Statut: s.status || 'N/A',
      Quantité: s.quantite ?? 1,
      DateScan: dateScanFormatted,
    };
  });
  
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Scans');

  // Ajout d'un petit style aux en-têtes (optionnel mais joli)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    if (cell) {
      cell.s = { font: { bold: true } };
    }
  }

  XLSX.writeFile(wb, `Scans_${inventaireId || 'Actuel'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast.success(`Export réussi (${scans.length} lignes)`);
};

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white dark:from-gray-950 dark:to-black text-black dark:text-white">
      <header className="sticky top-0 z-10 dark:bg-black/80 backdrop-blur-lg rounded-2xl py-4 border-b border-gray-200/50 dark:border-gray-700/50 mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-center mb-6">
            Résumé Inventaire {inventaireId ? `#${inventaireId}` : ''}
          </h1>

          {/* Cartes pour tous les grades */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {['A+', 'A', 'B', 'C', 'D'].map(grade => (
              <Card key={grade} className="shadow-xl">
                <CardHeader className="p-2">
                  <CardTitle className="text-md text-center">{grade}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-md font-bold text-emerald-500">
                    {grandTotalByGrade[grade] || 0}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xl font-bold text-center text-yellow-500 mb-8">
            Total général : {totalGeneral}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {produits.length === 0 ? (
          <p className="text-center text-xl text-gray-600 dark:text-gray-400">
            Aucun appareil scanné dans cet inventaire
          </p>
        ) : (
          <div className="overflow-x-auto border  shadow">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 dark:bg-gray-800">
                  <TableHead>Modèle</TableHead>
                  <TableHead>Capacité</TableHead>
                  <TableHead>Couleur</TableHead>
                  <TableHead className="text-center">A+</TableHead>
                  <TableHead className="text-center">A</TableHead>
                  <TableHead className="text-center">B</TableHead>
                  <TableHead className="text-center">C</TableHead>
                  <TableHead className="text-center">D</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produits.map((p, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{p.model}</TableCell>
                    <TableCell>{p.capacity}</TableCell>
                    <TableCell>{p.color}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-600">
                      {p.revvoGrade === 'A+' ? p.quantiteTotale : ''}
                    </TableCell>
                    <TableCell className="text-center font-bold text-emerald-600">
                      {p.revvoGrade === 'A' ? p.quantiteTotale : ''}
                    </TableCell>
                    <TableCell className="text-center font-bold text-blue-600">
                      {p.revvoGrade === 'B' ? p.quantiteTotale : ''}
                    </TableCell>
                    <TableCell className="text-center font-bold text-orange-600">
                      {p.revvoGrade === 'C' ? p.quantiteTotale : ''}
                    </TableCell>
                    <TableCell className="text-center font-bold text-red-600">
                      {p.revvoGrade === 'D' ? p.quantiteTotale : ''}
                    </TableCell>
                    <TableCell className="text-center font-bold text-yellow-600">
                      {p.quantiteTotale}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-gray-200 dark:bg-gray-900 font-bold">
                <TableRow>
                  <TableCell colSpan={3} className="text-right">Totaux :</TableCell>
                  <TableCell className="text-center text-emerald-600">
                    {grandTotalByGrade['A+'] || 0}
                  </TableCell>
                  <TableCell className="text-center text-emerald-600">
                    {grandTotalByGrade['A'] || 0}
                  </TableCell>
                  <TableCell className="text-center text-blue-600">
                    {grandTotalByGrade['B'] || 0}
                  </TableCell>
                  <TableCell className="text-center text-orange-600">
                    {grandTotalByGrade['C'] || 0}
                  </TableCell>
                  <TableCell className="text-center text-red-600">
                    {grandTotalByGrade['D'] || 0}
                  </TableCell>
                  <TableCell className="text-center text-yellow-600">
                    {totalGeneral}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        {/* Boutons */}
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href={`/scan?inventaireId=${inventaireId}`}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-xl text-white font-bold shadow-lg"
          >
            <BsUpcScan /> Continuer à scanner
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 bg-red-700 hover:bg-red-800 px-6 py-3 rounded-xl text-white font-bold shadow-lg"
          >
            <FaTableCells /> Voir les inventaires
          </Link>

          {produits.length > 0 && (
            <>
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl text-white font-bold shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Télécharger PDF
              </button>

              <button
                onClick={downloadExcel}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 px-6 py-3 rounded-xl text-white font-bold shadow-lg"
              >
                <FaTableCells className="w-5 h-5" />
                Télécharger Excel
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResumePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <ResumeContent />
    </Suspense>
  );
}