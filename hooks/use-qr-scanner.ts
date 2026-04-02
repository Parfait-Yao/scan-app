"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface UseQrScannerOptions {
  elementId: string;
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  enabled?: boolean;
}

export function useQrScanner({
  elementId,
  onScanSuccess,
  onScanError,
  enabled = true,
}: UseQrScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMounted = useRef(true);
  const isProcessing = useRef(false);

  // ✅ FIX 1 : Stocker les callbacks dans des refs pour éviter
  // que chaque re-render du parent (changement d'état) ne provoque
  // un redémarrage du scanner via les deps du useEffect.
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanErrorRef = useRef(onScanError);
  useEffect(() => { onScanSuccessRef.current = onScanSuccess; }, [onScanSuccess]);
  useEffect(() => { onScanErrorRef.current = onScanError; }, [onScanError]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    if (isMounted.current) setIsScanning(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Quand désactivé (ex: showPrompt=true), arrêter proprement
      stopScanner();
      return;
    }

    isMounted.current = true;

    const startScanner = async () => {
      // Attendre que le DOM soit prêt
      await new Promise((r) => setTimeout(r, 300));

      const element = document.getElementById(elementId);
      if (!element || !isMounted.current) return;

      // Ne pas redémarrer si déjà en cours
      if (scannerRef.current) return;

      try {
        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Verrou anti-spam : un seul traitement à la fois
            if (isProcessing.current) return;
            isProcessing.current = true;
            // ✅ Appel via ref → pas de dépendance instable dans le useEffect
            onScanSuccessRef.current(decodedText);
          },
          (errorMessage) => {
            if (onScanErrorRef.current) onScanErrorRef.current(errorMessage);
          }
        );

        if (isMounted.current) {
          setIsScanning(true);
          setError("");
        }
      } catch (err: any) {
        if (!isMounted.current) return;
        const msg =
          err.name === "NotAllowedError"
            ? "Accès caméra refusé"
            : "Impossible d'accéder à la caméra";
        setError(msg);
      }
    };

    startScanner();

    return () => {
      isMounted.current = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  // ✅ FIX 1 : Retirer onScanSuccess/onScanError des deps (callbacks via refs)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId, enabled]);

  const unlockScanner = () => {
    isProcessing.current = false;
  };

  return { isScanning, error, unlockScanner };
}
