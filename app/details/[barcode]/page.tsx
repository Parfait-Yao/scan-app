/* eslint-disable react/no-unescaped-entities */
// app/details/[barcode]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSave, FaTimes, FaBarcode } from 'react-icons/fa';

export default function ProductDetailsPage() {
  const { barcode } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    marque: 'Apple',
    model: '',
    capacity: '',
    couleur: '',
    depot: 'A',
    depotVente: '',
    quantite: 1,
    prixUnitaire: '',
    description: '',
  });

  // Récupérer les infos existantes du produit (si déjà créé temporairement)
  useEffect(() => {
    const fetchProduit = async () => {
      try {
        const res = await fetch(`/api/produit?barcode=${barcode}`);
        const json = await res.json();

        if (json.produit) {
          setFormData({
            marque: json.produit.marque || 'Apple',
            model: json.produit.model || '',
            capacity: json.produit.capacity || '',
            couleur: json.produit.couleur || '',
            depot: json.produit.depot || 'A',
            depotVente: json.produit.depotVente || '',
            quantite: json.produit.quantite || 1,
            prixUnitaire: json.produit.prixUnitaire || '',
            description: json.produit.description || '',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduit();
  }, [barcode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantite' || name === 'prixUnitaire' ? Number(value) || '' : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation simple
    if (!formData.model || !formData.capacity || !formData.couleur) {
      toast.error('Veuillez remplir au moins : Modèle, Capacité et Couleur');
      return;
    }

    try {
      const res = await fetch('/api/update-produit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode,
          ...formData,
          quantite: Number(formData.quantite),
          prixUnitaire: formData.prixUnitaire ? Number(formData.prixUnitaire) : null,
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');

      toast.success('Appareil enregistré avec succès !');
      setTimeout(() => router.push('/scanner'), 1500);
    } catch (err) {
      toast.error('Erreur lors de l’enregistrement');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 to-gray-900 text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-4 border-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Chargement des détails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white p-6">
      <ToastContainer theme="dark" position="top-center" autoClose={3000} />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <FaBarcode className="text-4xl text-emerald-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
            Détails de l'appareil
          </h1>
        </div>

        {/* Code-barres affiché */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mb-6 text-center">
          <p className="text-gray-400 text-sm mb-1">Code-barres scanné</p>
          <p className="text-xl font-mono text-white">{barcode}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900/60 backdrop-blur-md p-8 rounded-2xl border border-gray-700 shadow-2xl">
          {/* Marque */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Marque</label>
            <input
              type="text"
              name="marque"
              value={formData.marque}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
              placeholder="Ex: Apple, Samsung..."
            />
          </div>

          {/* Modèle */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Modèle <span className="text-red-400">*</span></label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
              placeholder="Ex: iPhone 13, Galaxy S23..."
            />
          </div>

          {/* Capacité */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Capacité <span className="text-red-400">*</span></label>
            <input
              type="text"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
              placeholder="Ex: 128GB, 256GB..."
            />
          </div>

          {/* Couleur */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Couleur <span className="text-red-400">*</span></label>
            <input
              type="text"
              name="couleur"
              value={formData.couleur}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
              placeholder="Ex: Midnight, Graphite, Bleu..."
            />
          </div>

          {/* Dépôt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Dépôt</label>
            <select
              name="depot"
              value={formData.depot}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
            >
              <option value="A">Dépôt A (meilleure qualité)</option>
              <option value="B">Dépôt B</option>
              <option value="Vente">Vente directe</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          {/* Dépôt vente (optionnel) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Dépôt vente (optionnel)</label>
            <input
              type="text"
              name="depotVente"
              value={formData.depotVente}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
              placeholder="Ex: Jumia, Site web..."
            />
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Quantité</label>
            <input
              type="number"
              name="quantite"
              value={formData.quantite}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Prix unitaire */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Prix unitaire (CFA)</label>
            <input
              type="number"
              name="prixUnitaire"
              value={formData.prixUnitaire}
              onChange={handleChange}
              step="1000"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
              placeholder="Ex: 350000"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description / État / Notes</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
              placeholder="Ex: État Grade A, rayures légères, batterie 92%..."
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <FaSave /> Enregistrer l'appareil
            </button>

            <button
              type="button"
              onClick={() => router.push('/scan')}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <FaTimes /> Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}