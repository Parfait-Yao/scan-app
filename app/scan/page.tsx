/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";
import { useRouter, useSearchParams } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

// Composant interne qui contient toute la logique (protégé par Suspense)
function ScanContent() {
  const searchParams = useSearchParams();
  const inventaireIdFromUrl = searchParams.get("inventaireId");

  const [scannedCount, setScannedCount] = useState(0);
  const [currentInventaireId, setCurrentInventaireId] = useState<number | null>(
    inventaireIdFromUrl ? Number(inventaireIdFromUrl) : null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const isMounted = useRef(true);
  const quaggaInitialized = useRef(false);

  // Son de succès (inchangé)
  const playSuccessBeep = () => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
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

  // Si pas d'inventaireId dans l'URL, en créer un nouveau (inchangé)
  useEffect(() => {
    const initInventaire = async () => {
      if (currentInventaireId) return;

      try {
        const res = await fetch("/api/inventaire", { method: "POST" });
        const data = await res.json();
        if (data.id) {
          setCurrentInventaireId(data.id);
          toast.info(`Inventaire #${data.id} démarré`, { autoClose: 1800 });
        }
      } catch {
        setError("Impossible de démarrer un inventaire");
      }
    };

    initInventaire();
  }, [currentInventaireId]);

  useEffect(() => {
    if (!currentInventaireId) return;

    const cleanup = () => {
      isMounted.current = false;
      if (quaggaInitialized.current) {
        Quagga.stop();
        Quagga.offDetected();
        Quagga.offProcessed();
        quaggaInitialized.current = false;
      }
    };

    const initAndStartScanner = async () => {
      setError("");
      setIsScanning(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Caméra non supportée. Utilisez HTTPS.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        stream.getTracks().forEach((t) => t.stop());
      } catch (err: any) {
        setError(
          err.name === "NotAllowedError"
            ? "Accès caméra refusé"
            : "Impossible d’accéder à la caméra",
        );
        return;
      }

      const target = document.querySelector("#scanner-viewport");
      if (!target) {
        setError("Conteneur introuvable");
        return;
      }

      try {
        await new Promise<void>((resolve, reject) => {
          Quagga.init(
            {
              inputStream: {
                type: "LiveStream",
                target,
                constraints: {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: "environment",
                },
              },
              locator: { patchSize: "medium", halfSample: true },
              numOfWorkers: navigator.hardwareConcurrency
                ? Math.min(4, navigator.hardwareConcurrency - 1)
                : 2,
              frequency: 12,
              decoder: {
                readers: [
                  "ean_reader",
                  "ean_8_reader",
                  "upc_reader",
                  "code_128_reader",
                  "code_39_reader",
                ],
              },
              locate: true,
            },
            (err) => (err ? reject(err) : resolve()),
          );
        });

        if (!isMounted.current) return;

        quaggaInitialized.current = true;
        Quagga.start();
        setIsScanning(true);

        Quagga.onDetected(async (data) => {
          let code = data?.codeResult?.code?.trim();
          if (!code) return;

          code = code.replace(/[^0-9]/g, "");

          try {
            // Appel unique à leur API
            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE}/product-serialize/${code}`,
            );

            const produit = response.data;

            if (!produit || !produit.imei) {
              toast.error("IMEI non trouvé dans leur système", {
                autoClose: 2000,
              });
              return;
            }

            // Envoie au back : IMEI + inventaireId + l'objet produit complet
            const saveRes = await fetch("/api/scan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imei: code,
                inventaireId: currentInventaireId,
                produit, // ← on envoie tout l'objet reçu
              }),
            });

            const json = await saveRes.json();

            if (!saveRes.ok || json.error) {
              toast.error(json.error || "Erreur ajout (déjà scanné ?)", {
                autoClose: 2000,
              });
              return;
            }

            // Succès
            setScannedCount((prev) => prev + 1);
            playSuccessBeep();
            if (navigator.vibrate) navigator.vibrate(150);

            toast.success(
              `+1 (${produit.brand || ""} ${produit.model || ""} ${produit.capacity || ""} - Grade ${produit.revvoGrade || "N/A"})`,
              { autoClose: 800 },
            );
          } catch (err: any) {
            if (err.response?.status === 404) {
              toast.error("IMEI inconnu dans la base", { autoClose: 1000 });
            } else {
              toast.error("Erreur lors de la vérification", {
                autoClose: 1000,
              });
            }
            console.error("Erreur API externe:", err);
          }

          // Re-démarre le scanner (inchangé)
          setTimeout(() => {
            if (isMounted.current) {
              Quagga.start();
              setIsScanning(true);
            }
          }, 600);
        });

        // Overlay visuel (inchangé)
        Quagga.onProcessed((result) => {
          const ctx = Quagga.canvas?.ctx?.overlay;
          const canvas = Quagga.canvas?.dom?.overlay;
          if (!ctx || !canvas) return;

          const w = parseInt(canvas.getAttribute("width") || "0");
          const h = parseInt(canvas.getAttribute("height") || "0");
          ctx.clearRect(0, 0, w, h);

          if (result?.boxes) {
            result.boxes
              .filter((b) => b !== result.box)
              .forEach((box) => {
                Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, ctx, {
                  color: "rgba(0,255,0,0.4)",
                  lineWidth: 2,
                });
              });
          }
          if (result?.box) {
            Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, ctx, {
              color: "#00aaff",
              lineWidth: 3,
            });
          }
          if (result?.codeResult?.code) {
            Quagga.ImageDebug.drawPath(result.line, { x: "x", y: "y" }, ctx, {
              color: "#ff3366",
              lineWidth: 4,
            });
          }
        });
      } catch (err: any) {
        setError("Échec initialisation : " + (err.message || "Erreur"));
      }
    };

    const timer = setTimeout(initAndStartScanner, 300);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [router, currentInventaireId]);

  const restartScanner = () => {
    setScannedCount(0);
    setError("");
    setIsScanning(false);
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden items-center justify-center">
      <ToastContainer
        theme="colored"
        position="top-center"
        autoClose={800}
        hideProgressBar
      />

      {/* Compteur fixe en haut – gardé tel quel */}
      <div className="fixed top-3 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md px-5 py-2 rounded-full border border-emerald-500/20 shadow-lg">
          <p className="text-sm sm:text-base font-medium text-white/95">
            Appareils scannés :{" "}
            <span className="text-emerald-300 font-semibold">
              {scannedCount}
            </span>
          </p>
        </div>
      </div>

      {/* <div className="w-full max-w-md my-5 text-center flex justify-center items-center">
        <h1 className="text-2xl font-bold text-center tracking-tight">
          Scanner Code-barres
        </h1>
      </div> */}

      {error && (
        <div className="w-full max-w-md bg-red-900/70 border border-red-600/50 text-red-100 p-4 rounded-xl mb-4 text-center shadow-lg">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Zone de scan : carrée, très grande, centrée – gardée telle quelle */}
      <div className="flex-1 flex items-center justify-center w-100 px-4">
        <div
          id="scanner-viewport"
          className={`relative w-full max-w-[85vw] aspect-square bg-black rounded-2xl overflow-hidden border-4 ${isScanning ? "border-emerald-500" : "border-gray-700"} shadow-sm shadow-black/60 transition-all duration-300`}
        />
      </div>

      <div className="text-center mb-10">
        {isScanning ? (
          <p className="text-emerald-400 font-medium text-lg animate-pulse">
            Scanning actif...
          </p>
        ) : (
          <p className="text-amber-400 font-medium">
            Préparation du scanner...
          </p>
        )}
      </div>

      {/* Boutons fixes en bas – gardés tels quels */}
      <div className="w-1/3 mx-auto mb-20 z-50 bg-linear-to-t from-black/40 to-transparent px-5  flex justify-center items-center  ">
        <div className="flex justify-center items-center max-w-md mx-auto  flex-wrap">
          <button className="w-100 bg-indigo-600 text-white py-2 px-2 rounded-xl font-semibold text-lg shadow-xl active:scale-[0.98] transition md:px-4">
            Résumé
          </button>
        </div>
      </div>

      <style jsx global>{`
        html,
        body,
        #__next {
          height: 100%;
          overflow: hidden;
        }
        #scanner-viewport {
          position: relative;
        }
        #scanner-viewport canvas.drawingBuffer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        #scanner-viewport video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
        }
      `}</style>
    </div>
  );
}

// Page principale avec Suspense
export default function ScannerPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-background flex items-center justify-center text-foreground">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-4 border-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-xl font-medium">Initialisation du scanner...</p>
          </div>
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
