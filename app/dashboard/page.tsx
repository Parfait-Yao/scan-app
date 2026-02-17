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
import { BarChart as BarIcon, Palette, Archive, Package } from "lucide-react";

// Typage adapté aux nouveaux champs
interface DashboardData {
  inventairesEvolution: Record<string, number>;           // "YYYY-MM": count
  models: Record<string, number>;                         // modèle → nombre total
  colorsByGrade: Record<string, Record<string, number>>;  // grade → couleur → count
  colorsByModel: Record<string, Record<string, number>>;  // modèle → couleur → count
  mostFrequentModel: string;
  leastFrequentModel: string;
  mostFrequentColor: string;
  mostFrequentGrade: string;                              // ← revvoGrade le plus fréquent
}

// Map des noms de couleurs vers hex (inchangé)
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

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Erreur chargement dashboard');
        const json: DashboardData = await res.json();
        setData(json);
      } catch (err) {
        setError('Erreur lors du chargement des données');
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

  // Préparation des données pour les charts
  const inventairesChartData = Object.entries(data.inventairesEvolution)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const modelsChartData = Object.entries(data.models)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const colorsByGradeData = Object.entries(data.colorsByGrade).flatMap(([grade, colors]) =>
    Object.entries(colors).map(([color, count]) => ({ grade, color, count }))
  );

  const colorsByModelData = Object.entries(data.colorsByModel).flatMap(([model, colors]) =>
    Object.entries(colors).map(([color, count]) => ({ model, color, count }))
  );

  // Custom Tooltip (inchangé)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-background border border-border p-3 rounded-md shadow-md">
          <p className="font-bold">{label}</p>
          <p className="text-sm">
            Couleur : <span style={{ color: COLOR_MAP[entry.color] || '#cccccc' }}>
              {entry.color}
            </span>
          </p>
          <p className="text-sm font-semibold">
            Nombre : {entry.count}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-8 min-h-screen bg-background text-foreground">
      {/* Cards stylées – inchangées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-border">
          <CardHeader className="flex flex-row items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <CardTitle>Modèle le plus fréquent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.mostFrequentModel}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow border-border">
          <CardHeader className="flex flex-row items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <CardTitle>Modèle le moins fréquent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.leastFrequentModel}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow border-border">
          <CardHeader className="flex flex-row items-center gap-3">
            <Palette className="h-6 w-6 text-primary" />
            <CardTitle>Couleur la plus fréquente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.mostFrequentColor}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow border-border">
          <CardHeader className="flex flex-row items-center gap-3">
            <Archive className="h-6 w-6 text-primary" />
            <CardTitle>Grade le plus fréquent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.mostFrequentGrade}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts stylés – inchangés, juste noms adaptés */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart : Nombre d'inventaires par mois */}
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
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Inventaires" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart : Nombre par modèle */}
        <Card className="shadow-lg border-border">
          <CardHeader>
            <CardTitle>Nombre par modèle</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={modelsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="value" fill="hsl(var(--primary))" name="Nombre" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart : Répartition des couleurs par grade */}
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
                <Bar dataKey="count" name="Nombre par couleur" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart : Répartition des couleurs par modèle */}
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
                <Bar dataKey="count" name="Nombre par couleur" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Custom Tooltip (inchangé)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    return (
      <div className="bg-background border border-border p-3 rounded-md shadow-md">
        <p className="font-bold">{label}</p>
        <p className="text-sm">
          Couleur : <span style={{ color: COLOR_MAP[entry.color] || '#cccccc' }}>
            {entry.color}
          </span>
        </p>
        <p className="text-sm font-semibold">
          Nombre : {entry.count}
        </p>
      </div>
    );
  }
  return null;
};