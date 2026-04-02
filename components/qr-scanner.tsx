"use client";

import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useQrScanner } from "@/hooks/use-qr-scanner";
import { processScan } from "@/lib/scan-utils";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  inventaireId: number;
  onScanComplete: () => void;
  onClose: () => void;
}

// Identifiant unique pour le div du scanner html5-qrcode
const QR_ELEMENT_ID = "qr-scanner-viewport";

export function QrScanner({ inventaireId, onScanComplete, onClose }: QrScannerProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [lastProduct, setLastProduct] = useState<any>(null);

  // ✅ FIX : ref pour briser la dépendance circulaire (handleScanSuccess → unlockScanner)
  const unlockScannerRef = useRef<() => void>(() => {});

  const playSuccessBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      try {
        const { produit } = await processScan(decodedText, "QR", inventaireId);
        setLastProduct(produit);
        playSuccessBeep();
        if (navigator.vibrate) navigator.vibrate(150);
        toast.success(
          `+1 QR (${produit.brand || ""} ${produit.model || ""} ${produit.capacity || ""} - Grade ${produit.revvoGrade || "N/A"})`,
          { id: "qr-scan-success", position: "top-center" }
        );
        onScanComplete();
        setShowPrompt(true);
      } catch (err: any) {
        if (navigator.vibrate) navigator.vibrate(500);
        const isDuplicate = err.message?.includes("déjà été scanné");
        if (isDuplicate) {
          toast.warning(err.message, { id: "qr-scan-warning", position: "top-center" });
        } else if (err.response?.status === 404 || err.status === 404) {
          toast.error("IMEI inconnu dans la base", { id: "qr-scan-error", position: "top-center" });
        } else {
          toast.error(err.message || "Erreur lors de la vérification", {
            id: "qr-scan-error",
            position: "top-center",
          });
        }
        // ✅ Libère le verrou via ref (pas de dépendance circulaire)
        setTimeout(() => unlockScannerRef.current(), 2500);
      }
    },
    [inventaireId, onScanComplete]
  );

  const { isScanning, error, unlockScanner } = useQrScanner({
    elementId: QR_ELEMENT_ID,
    onScanSuccess: handleScanSuccess,
    enabled: !showPrompt,
  });

  // Synchronise la ref avec la vraie fonction du hook
  unlockScannerRef.current = unlockScanner;

  const continueScanning = () => {
    setShowPrompt(false);
    // Le scanner redémarre automatiquement via enabled=!showPrompt (hook)
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-purple-500/30 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl">
        {!showPrompt ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Scanner QR Code</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {error ? (
              <div className="bg-red-900/70 border border-red-600/50 text-red-100 p-4 rounded-xl mb-4">
                <p className="font-medium">{error}</p>
              </div>
            ) : null}

            {/* Zone de scan QR */}
            <div
              id={QR_ELEMENT_ID}
              className={`w-full aspect-square rounded-2xl overflow-hidden border-4 ${
                isScanning ? "border-purple-500" : "border-gray-700"
              } bg-black transition-all duration-300 mb-4`}
            />

            <p className={`text-sm font-medium ${isScanning ? "text-purple-400 animate-pulse" : "text-amber-400"}`}>
              {isScanning ? "Pointez la caméra sur un QR code..." : "Initialisation..."}
            </p>

            <Button
              onClick={onClose}
              className="mt-4 w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl"
            >
              Annuler
            </Button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">✅</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">QR Scanné !</h3>
            {lastProduct && (
              <p className="text-zinc-400 text-sm mb-6">
                {lastProduct.brand} {lastProduct.model} {lastProduct.capacity} — Grade {lastProduct.revvoGrade || "N/A"}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-2xl font-semibold"
              >
                Terminer
              </Button>
              <Button
                onClick={continueScanning}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-2xl font-semibold active:scale-95"
              >
                Scanner encore
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
