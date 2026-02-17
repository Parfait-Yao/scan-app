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
import { Moon, Sun } from 'lucide-react';

// Import shadcn Table
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ────────────────────────────────────────────────
// Interfaces adaptées aux nouveaux champs
// ────────────────────────────────────────────────

interface GroupedProduit {
  model: string;
  capacity: string;
  color: string;          // ← changé de couleur à color
  revvoGrade: string;     // ← grade (A, B, etc.)
  nbAppareils: number;
}

interface InventaireItem {
  imei: string;
  brand: string;
  model: string;
  capacity: string;
  color: string;
  revvoGrade: string;
  status: string;
}

interface SummaryResponse {
  produits: GroupedProduit[];
  scans: InventaireItem[]; // liste détaillée pour Excel
  grandTotalA: number;
  grandTotalB: number;
  grandTotal: number;
  date: string;
  inventaireId?: number;
}

// ────────────────────────────────────────────────
// Composant interne
// ────────────────────────────────────────────────

function ResumeContent() {
  const searchParams = useSearchParams();
  const inventaireId = searchParams.get('inventaireId');

  const [inventaire, setInventaire] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Gestion du thème (inchangé)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const fetchResume = async () => {
      try {
        let url = '/api/summary';
        if (inventaireId) {
          url += `?inventaireId=${inventaireId}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json: unknown = await res.json();

        if (json && typeof json === 'object' && 'error' in json) {
          throw new Error((json as { error: string }).error);
        }

        const data = json as SummaryResponse;
        setInventaire(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(message || 'Impossible de charger l’inventaire');
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, [inventaireId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white dark:from-gray-950 dark:to-black flex items-center justify-center text-black dark:text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-4 border-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-xl font-medium">Chargement du résumé...</p>
        </div>
      </div>
    );
  }

  if (error || !inventaire) {
    return (
      <div className="min-h-screen bg-linear-to-b from-gray-100 to-white dark:from-gray-950 dark:to-black flex items-center justify-center text-black dark:text-white p-6">
        <div className="text-center max-w-md">
          <h1 className="text-5xl font-bold text-red-500 mb-6">Oups !</h1>
          <p className="text-2xl mb-8">{error || 'Aucun appareil scanné dans cet inventaire'}</p>
          <Link href="/scan" className="inline-block bg-emerald-600 px-10 py-5 rounded-xl hover:bg-emerald-700 text-lg font-bold shadow-lg transition text-white">
            Retour au scanner
          </Link>
        </div>
      </div>
    );
  }

  const produits: GroupedProduit[] = Array.isArray(inventaire.produits) ? inventaire.produits : [];
  const scans: InventaireItem[] = Array.isArray(inventaire.scans) ? inventaire.scans : [];
  const date: string = inventaire.date || new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const totalA: number = Number(inventaire.grandTotalA) || 0;
  const totalB: number = Number(inventaire.grandTotalB) || 0;
  const totalGeneral: number = Number(inventaire.grandTotal) || 0;

  // Groupement adapté (model, capacity, color, revvoGrade)
  const regrouped = produits.reduce((acc: Record<string, any>, p: GroupedProduit) => {
    const key = `${p.model}-${p.capacity}-${p.color}-${p.revvoGrade}`;

    if (!acc[key]) {
      acc[key] = {
        model: p.model,
        capacity: p.capacity,
        color: p.color,
        revvoGrade: p.revvoGrade,
        countA: 0,
        totalA: 0,
        countB: 0,
        totalB: 0,
        countVente: 0,
        totalVente: 0,
      };
    }

    if (p.revvoGrade === 'A') {
      acc[key].countA += p.nbAppareils;
      acc[key].totalA += p.nbAppareils;
    } else if (p.revvoGrade === 'B') {
      acc[key].countB += p.nbAppareils;
      acc[key].totalB += p.nbAppareils;
    } else {
      acc[key].countVente += p.nbAppareils;
      acc[key].totalVente += p.nbAppareils;
    }

    return acc;
  }, {});

  // PDF – adapté aux nouveaux noms
  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(`Résumé Inventaire #${inventaireId || 'Actuel'}`, 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text(`Date : ${date}`, 20, 30);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Totaux :', 20, 45);

    doc.setFontSize(12);
    doc.text(`Grade A : ${totalA}`, 20, 55);
    doc.text(`Grade B : ${totalB}`, 20, 62);
    doc.text(`Total général : ${totalGeneral}`, 20, 69);

    if (Object.keys(regrouped).length > 0) {
      const tableColumn = ['Modèle', 'Capacité', 'Couleur', 'Grade', 'A', 'Total A', 'B', 'Total B', 'Total'];
      const tableRows = Object.values(regrouped).map((group) => [
        group.model || '',
        group.capacity || '',
        group.color || '',
        group.revvoGrade || '',
        group.countA || 0,
        group.totalA || 0,
        group.countB || 0,
        group.totalB || 0,
        group.totalA + group.totalB || 0,
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3, textColor: 0 },
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${i} / ${pageCount}`, 20, doc.internal.pageSize.height - 10);
    }

    doc.save(`Inventaire_${inventaireId || 'Actuel'}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Excel – adapté aux nouveaux champs
  const downloadExcel = () => {
    if (scans.length === 0) {
      toast.error('Aucun scan à exporter');
      return;
    }

    const excelData = scans.map(scan => ({
      'IMEI': scan.imei,
      'Marque': scan.brand || '',
      'Modèle': scan.model || '',
      'Capacité': scan.capacity || '',
      'Couleur': scan.color || '',
      'Grade': scan.revvoGrade || '',
      'Status': scan.status || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Scans');

    XLSX.writeFile(workbook, `Scans_Inv_${inventaireId || 'Actuel'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-100 via-gray-200 to-white dark:from-gray-950 dark:via-gray-900 dark:to-black text-black dark:text-white ">
      {/* En-tête avec toggle – inchangé */}
      <header className="sticky top-0 z-10 dark:bg-black/80 backdrop-blur-lg rounded-2xl py-4 border border-gray-200/50 dark:border-gray-700/50  mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 flex flex-col justify-between items-center">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
            <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              Résumé Inventaire {inventaireId ? `#${inventaireId}` : ''}
            </h1>
            
          </div>

          {/* Totaux – adapté à revvoGrade */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center w-full">
            <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-6 rounded-2xl border border-emerald-500/30 shadow-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Grade A</p>
              <p className="text-4xl font-bold text-emerald-400">{totalA}</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-6 rounded-2xl border border-blue-500/30 shadow-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Grade B</p>
              <p className="text-4xl font-bold text-blue-400">{totalB}</p>
            </div>
            <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md p-6 rounded-2xl border border-yellow-500/30 shadow-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total général</p>
              <p className="text-4xl font-bold text-yellow-400">{totalGeneral}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tableau – adapté aux nouveaux noms */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {produits.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 text-xl">Aucun appareil scanné dans cet inventaire</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-gray-300 dark:border-gray-700 shadow-2xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-gray-200/90 dark:bg-gray-800/90 sticky top-0">
                <TableRow>
                  <TableHead className="p-4 text-left font-semibold text-black dark:text-white">Modèle</TableHead>
                  <TableHead className="p-4 text-left font-semibold text-black dark:text-white">Capacité</TableHead>
                  <TableHead className="p-4 text-left font-semibold text-black dark:text-white">Couleur</TableHead>
                  <TableHead className="p-4 text-center font-semibold text-black dark:text-white">Grade</TableHead>
                  <TableHead className="p-4 text-center font-semibold text-black dark:text-white">A</TableHead>
                  <TableHead className="p-4 text-center font-semibold text-black dark:text-white">Total A</TableHead>
                  <TableHead className="p-4 text-center font-semibold text-black dark:text-white">B</TableHead>
                  <TableHead className="p-4 text-center font-semibold text-black dark:text-white">Total B</TableHead>
                  <TableHead className="p-4 text-center font-semibold text-black dark:text-white">Total</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {Object.values(regrouped).map((group: any, idx: number) => (
                  <TableRow
                    key={idx}
                    className="border-b border-gray-300 dark:border-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition"
                  >
                    <TableCell className="p-4 font-semibold text-black dark:text-white">{group.model}</TableCell>
                    <TableCell className="p-4 text-black dark:text-white">{group.capacity}</TableCell>
                    <TableCell className="p-4 text-black dark:text-white">{group.color}</TableCell>
                    <TableCell className="p-4 text-center text-black dark:text-white">{group.revvoGrade}</TableCell>
                    <TableCell className="p-4 text-center text-black dark:text-white">{group.countA}</TableCell>
                    <TableCell className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {group.totalA}
                    </TableCell>
                    <TableCell className="p-4 text-center text-black dark:text-white">{group.countB}</TableCell>
                    <TableCell className="p-4 text-center font-bold text-blue-600 dark:text-blue-400">
                      {group.totalB}
                    </TableCell>
                    <TableCell className="p-4 text-center font-bold text-yellow-600 dark:text-yellow-400">
                      {group.totalA + group.totalB}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              <TableFooter className="bg-gray-200 dark:bg-gray-900 font-bold">
                <TableRow>
                  <TableCell colSpan={4} className="p-5 text-right text-lg text-black dark:text-white">
                    Totaux :
                  </TableCell>
                  <TableCell className="p-5 text-center"></TableCell>
                  <TableCell className="p-5 text-center text-yellow-600 dark:text-yellow-400 text-2xl">
                    {totalGeneral}
                  </TableCell>
                  <TableCell className="p-5 text-center"></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        {/* Boutons – inchangés */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center flex-wrap gap-4">
          <Link
            href={`/scan?inventaireId=${inventaireId}`}
            className="bg-linear-to-r flex items-center justify-center from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 px-5 py-3 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 text-white text-center"
          >
            <BsUpcScan className="mr-2" /> Continuer à scanner
          </Link>

          <Link href="/" className="flex justify-center items-center gap-2 bg-linear-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 px-5 py-3 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 text-white text-center">
            <FaTableCells /> Voir l’inventaire
          </Link>

          {produits.length > 0 && (
            <button
              onClick={downloadPDF}
              className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 px-5 py-3 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 text-white flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Télécharger PDF
            </button>
          )}

          {produits.length > 0 && (
            <button
              onClick={downloadExcel}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 px-5 py-3 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 text-white flex items-center gap-2"
            >
              <FaTableCells className="w-5 h-5" />
              Télécharger Excel
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// Page principale avec Suspense (inchangée)
export default function ResumePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-b from-gray-100 to-white dark:from-gray-950 dark:to-black flex items-center justify-center text-black dark:text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-4 border-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-xl font-medium">Chargement du résumé...</p>
        </div>
      </div>
    }>
      <ResumeContent />
    </Suspense>
  );
}