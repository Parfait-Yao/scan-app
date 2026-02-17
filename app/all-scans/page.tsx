/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Smartphone, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Typage adapté à InventaireItem
interface ScanFull {
  imei: string;
  marque: string;
  model: string;
  capacity: string;
  color: string;
  revvoGrade: string;
  status: string;
  dateScan: string;
  inventaireId: number;
  inventaireDate: string;
}

export default function AllScansPage() {
  const [scans, setScans] = useState<ScanFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = '/api/all-scans';
        const params = new URLSearchParams();

        if (modelFilter.trim()) {
          params.append('model', modelFilter.trim());
        }
        if (selectedDate) {
          params.append('date', selectedDate.toISOString().split('T')[0]);
        }

        if (params.size > 0) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Erreur lors du chargement des scans');

        const json = await res.json();
        setScans(json || []);
      } catch (err) {
        setError('Erreur lors du chargement des données');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [modelFilter, selectedDate]);

  const hasFilters = modelFilter.trim() !== '' || !!selectedDate;
  const noResults = hasFilters && scans.length === 0;

  // Affichage pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 border-4 border-t-4 border-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-2xl font-semibold text-foreground animate-pulse">Chargement des scans en cours...</p>
        </div>
      </div>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted text-destructive">
        <div className="text-center max-w-md space-y-6 p-8 bg-card shadow-2xl">
          <h1 className="text-6xl font-bold">Erreur</h1>
          <p className="text-2xl">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 min-h-screen bg-linear-to-br from-background to-muted text-foreground ">
      <Card className="shadow-2xl border-border overflow-hidden">
        <CardHeader className="bg-linear-to-r from-primary to-primary/80 text-primary-foreground">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <Smartphone className="h-7 w-7" />
            Tous les appareils scannés
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="flex-1 flex items-center gap-3 bg-card rounded-lg shadow-md p-3">
              <Filter className="h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="Filtrer par modèle..."
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="w-full border-none focus-visible:ring-0"
              />
            </div>

            <div className="flex-1 flex items-center gap-3 bg-card rounded-lg shadow-md p-3">
              <CalendarIcon className="h-6 w-6 text-muted-foreground" />
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left font-normal hover:bg-transparent",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    {selectedDate ? (
                      format(selectedDate, "dd MMM yyyy", { locale: fr })
                    ) : (
                      <span>Filtrer par date de scan</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-lg rounded-xl border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Message quand il n'y a pas de résultat pour le filtre actif */}
          {noResults && (
            <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-xl mb-6">
              <p className="text-xl font-medium">Aucun appareil trouvé</p>
              <p className="mt-2">
                Aucun scan ne correspond à votre recherche. Essayez d&apos;autres critères.
              </p>
            </div>
          )}

          {/* Le tableau reste TOUJOURS visible */}
          <div className="overflow-x-auto border border-border shadow-inner">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[150px] font-bold">IMEI</TableHead>
                  <TableHead className="font-bold">Marque</TableHead>
                  <TableHead className="font-bold">Modèle</TableHead>
                  <TableHead className="font-bold">Capacité</TableHead>
                  <TableHead className="font-bold">Couleur</TableHead>
                  <TableHead className="font-bold">Grade</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Date Scan</TableHead>
                  <TableHead className="font-bold">Inventaire ID</TableHead>
                  <TableHead className="font-bold">Date Inventaire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                      {hasFilters
                        ? "Aucun résultat pour les filtres appliqués"
                        : "Aucun scan enregistré pour le moment"}
                    </TableCell>
                  </TableRow>
                ) : (
                  scans.map((scan, index) => (
                    <TableRow key={index} className="hover:bg-muted/30 transition-all duration-200">
                      <TableCell className="font-medium">{scan.imei}</TableCell>
                      <TableCell>{scan.marque}</TableCell>
                      <TableCell>{scan.model}</TableCell>
                      <TableCell>{scan.capacity}</TableCell>
                      <TableCell>{scan.color}</TableCell>
                      <TableCell>{scan.revvoGrade}</TableCell>
                      <TableCell>{scan.status}</TableCell>
                      <TableCell>{new Date(scan.dateScan).toLocaleString('fr-FR')}</TableCell>
                      <TableCell>{scan.inventaireId}</TableCell>
                      <TableCell>{new Date(scan.inventaireDate).toLocaleDateString('fr-FR')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}