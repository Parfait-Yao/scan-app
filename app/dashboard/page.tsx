/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Package, Palette, Archive, Layers, Trophy } from "lucide-react";

// Typage complet
interface DashboardData {
  inventairesEvolution: Record<string, number>;
  models: Record<string, number>;
  colorsByGrade: Record<string, Record<string, number>>;
  colorsByModel: Record<string, Record<string, number>>;
  mostFrequentModel: string;
  leastFrequentModel: string;
  mostFrequentColor: string;
  mostFrequentGrade: string;
  totalQuantite: number;
  gradeTotals: Record<string, number>;  // A+, A, B, C, D, Inconnu
}

const COLOR_MAP: Record<string, string> = {
  'Rouge': '#ff0000',
  'Bleu': '#0000ff',
  'Noir': '#000000',
  'Blanc': '#ffffff',
  'Vert': '#008000',
  'Jaune': '#ffff00',
  'Gris': '#808080',
  'Rose': '#ffc0cb',
  'Violet': '#ee82ee',
  'Orange': '#ffa500',
  'Argent': '#c0c0c0',
  'Or': '#ffd700',
  'Marron': '#a52a2a',
  'Inconnu': '#cccccc',
};

const GRADE_COLORS: Record<string, string> = {
  'A+': '#22c55e',
  'A': '#16a34a',
  'B': '#eab308',
  'C': '#f97316',
  'D': '#ef4444',
  'Inconnu': '#6b7280',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError('Impossible de charger les données du dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-4 border-primary rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-xl font-medium text-foreground">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive">
        <div className="text-center max-w-md">
          <h1 className="text-5xl font-bold mb-6">Erreur</h1>
          <p className="text-xl mb-8">{error || 'Aucune donnée disponible'}</p>
        </div>
      </div>
    );
  }

  const gradeTotals = data.gradeTotals || {};

  // Données pour le graphique Quantité par grade
  const gradeChartData = [
    { grade: 'A+', quantite: gradeTotals['A+'] || 0 },
    { grade: 'A', quantite: gradeTotals['A'] || 0 },
    { grade: 'B', quantite: gradeTotals['B'] || 0 },
    { grade: 'C', quantite: gradeTotals['C'] || 0 },
    { grade: 'D', quantite: gradeTotals['D'] || 0 },
  ];

  // Préparation des données pour les charts
  const inventairesChartData = Object.entries(data.inventairesEvolution || {})
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const modelsChartData = Object.entries(data.models || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const colorsByGradeData = Object.entries(data.colorsByGrade || {}).flatMap(([grade, colors]) =>
    Object.entries(colors).map(([color, count]) => ({ grade, color, count }))
  );

  const colorsByModelData = Object.entries(data.colorsByModel || {}).flatMap(([model, colors]) =>
    Object.entries(colors).map(([color, count]) => ({ model, color, count }))
  );

  // Custom Tooltip amélioré
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-background border border-border p-4 rounded-lg shadow-lg min-w-[180px]">
          <p className="font-bold mb-2">{label}</p>
          {entry.color && (
            <p className="text-sm mb-1">
              Couleur : <span style={{ color: COLOR_MAP[entry.color] || '#cccccc' }}>
                {entry.color}
              </span>
            </p>
          )}
          <p className="text-sm font-semibold">
            Quantité : <span className="text-primary">{entry.count || entry.quantite || 0}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-background text-foreground">
      {/* Cartes */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-6">
        {/* Modèle le plus fréquent */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-border">
          <CardHeader className="flex flex-row items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <CardTitle>Modèle le plus fréquent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.mostFrequentModel}</p>
          </CardContent>
        </Card>

        {/* Couleur la plus fréquente */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-border">
          <CardHeader className="flex flex-row items-center gap-3">
            <Palette className="h-6 w-6 text-primary" />
            <CardTitle>Couleur la plus fréquente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.mostFrequentColor}</p>
          </CardContent>
        </Card>

        {/* Grade le plus fréquent */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-border">
          <CardHeader className="flex flex-row items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <CardTitle>Grade le plus fréquent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" style={{ color: GRADE_COLORS[data.mostFrequentGrade] || '#6b7280' }}>
              {data.mostFrequentGrade}
            </p>
          </CardContent>
        </Card>

        {/* Cartes des 5 grades */}
        {['A+', 'A', 'B', 'C', 'D'].map(grade => (
          <Card key={grade} className="shadow-lg hover:shadow-xl transition-shadow border-border">
            <CardHeader className="flex flex-row items-center gap-3">
              <Archive className="h-6 w-6" style={{ color: GRADE_COLORS[grade] }} />
              <CardTitle>{grade}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" style={{ color: GRADE_COLORS[grade] }}>
                {gradeTotals[grade] || 0}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Total global */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-border lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-3">
            <Layers className="h-6 w-6 text-primary" />
            <CardTitle>Total appareils scannés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{data.totalQuantite}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventaires par mois */}
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle>Nombre d&apos;inventaires par mois</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={inventairesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Inventaires" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quantité par modèle */}
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle>Quantité par modèle</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={modelsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="value" fill="hsl(var(--primary))" name="Quantité totale" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quantité par grade */}
        <Card className="shadow-lg border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Quantité par grade</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={gradeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="grade" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="quantite" fill="hsl(var(--primary))" name="Quantité" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition couleurs par grade */}
        <Card className="shadow-lg border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Répartition des couleurs par grade</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={colorsByGradeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="grade" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="count" name="Quantité par couleur" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition couleurs par modèle */}
        <Card className="shadow-lg border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Répartition des couleurs par modèle</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={colorsByModelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="model" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="count" name="Quantité par couleur" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Custom Tooltip amélioré
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    return (
      <div className="bg-background border border-border p-4 rounded-lg shadow-lg min-w-[180px]">
        <p className="font-bold mb-2">{label}</p>
        {entry.color && (
          <p className="text-sm mb-1">
            Couleur : <span style={{ color: COLOR_MAP[entry.color] || '#cccccc' }}>
              {entry.color}
            </span>
          </p>
        )}
        <p className="text-sm font-semibold">
          Quantité : <span className="text-primary">{entry.count || entry.quantite || 0}</span>
        </p>
      </div>
    );
  }
  return null;
};