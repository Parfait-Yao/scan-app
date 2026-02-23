/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function ScanContent() {
  const searchParams = useSearchParams();
  const inventaireIdFromUrl = searchParams.get("inventaireId");

  const [hasScans, setHasScans] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  const [currentInventaireId, setCurrentInventaireId] = useState<number | null>(
    () => {
      if (inventaireIdFromUrl) return Number(inventaireIdFromUrl);
      if (typeof window !== "undefined") {
        const saved = sessionStorage.getItem("currentInventaireId");
        return saved ? Number(saved) : null;
      }
      return null;
    },
  );

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const [showScanPrompt, setShowScanPrompt] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);

  const router = useRouter();
  const isMounted = useRef(true);
  const quaggaInitialized = useRef(false);
  // 🔒 Verrou : empêche le traitement simultané de plusieurs détections Quagga
  const isProcessing = useRef(false);
  // 🔁 Mémorise le dernier code traité pour ignorer les re-détections immédiates du même code
  const lastProcessedCode = useRef<string>("");
  const lastProcessedTime = useRef<number>(0);

  // ✅ FIX 2 : Synchronise l'inventaireId dans l'URL pour survivre à l'actualisation
  useEffect(() => {
    if (currentInventaireId && !inventaireIdFromUrl) {
      router.replace(`?inventaireId=${currentInventaireId}`);
    }
  }, [currentInventaireId, inventaireIdFromUrl, router]);

  // Recharge le compteur depuis la base à chaque chargement / changement d'inventaire
  useEffect(() => {
    if (!currentInventaireId) return;

    const checkRealCount = async () => {
      try {
        const res = await fetch(`/api/inventaire/${currentInventaireId}/count`);
        if (!res.ok) return;
        const { count } = await res.json();
        setScannedCount(count);
        setHasScans(count > 0);
      } catch (e) {
        console.error("Erreur compteur", e);
      }
    };

    checkRealCount();
  }, [currentInventaireId]);

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

  useEffect(() => {
    const initInventaire = async () => {
      if (currentInventaireId) return;
      try {
        const res = await fetch("/api/inventaire", { method: "POST" });
        const data = await res.json();
        if (data.id) {
          setCurrentInventaireId(data.id);
          sessionStorage.setItem("currentInventaireId", String(data.id));
          toast(`Inventaire #${data.id} démarré`, { position: "top-center" });
        }
      } catch {
        setError("Impossible de démarrer un inventaire");
      }
    };
    initInventaire();
  }, [currentInventaireId]);

  const continueScanning = () => {
    // 🔓 Débloque le verrou et efface le dernier code pour permettre un nouveau scan
    isProcessing.current = false;
    lastProcessedCode.current = "";
    setShowScanPrompt(false);
    setIsScanning(false);
    setTimeout(() => {
      setScannerKey((prev) => prev + 1);
    }, 180);
  };

  useEffect(() => {
    if (!currentInventaireId) return;

    const cleanup = () => {
      isMounted.current = false;
      isProcessing.current = false;
      if (quaggaInitialized.current) {
        Quagga.stop();
        // ✅ FIX 1 : Supprime TOUS les listeners avant de quitter
        Quagga.offDetected();
        Quagga.offProcessed();
        quaggaInitialized.current = false;
      }

      document.querySelectorAll("video").forEach((video) => {
        if (video.srcObject) {
          (video.srcObject as MediaStream)
            .getTracks()
            .forEach((track) => track.stop());
        }
      });
    };

    isMounted.current = true;

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
            : "Impossible d'accéder à la caméra",
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

        // ✅ FIX 1 : Retire l'ancien listener AVANT d'en ajouter un nouveau
        Quagga.offDetected();
        Quagga.onDetected(async (data) => {
          let code = data?.codeResult?.code?.trim();
          if (!code) return;
          code = code.replace(/[^0-9]/g, "");
          if (!code) return;

          const now = Date.now();

          // 🔒 VERROU 1 : Un seul traitement à la fois (bloque les détections parallèles)
          if (isProcessing.current) return;

          // 🔒 VERROU 2 : Ignore le même code si détecté dans les 3 secondes
          // (Quagga peut détecter 10-15x/sec le même barcode → cause des toasts en cascade)
          if (
            code === lastProcessedCode.current &&
            now - lastProcessedTime.current < 3000
          ) {
            return;
          }

          isProcessing.current = true;
          lastProcessedCode.current = code;
          lastProcessedTime.current = now;

          try {
            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE}/product-serialize/${code}`,
            );
            const produit = response.data;

            if (!produit || !produit.imei) {
              // Toast avec ID fixe → impossible d'en empiler plusieurs
              toast.error("IMEI non trouvé dans leur système", {
                id: "scan-error",
                position: "top-center",
              });
              isProcessing.current = false;
              return;
            }

            const saveRes = await fetch("/api/scan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imei: code,
                inventaireId: currentInventaireId,
                produit,
              }),
            });

            const json = await saveRes.json();

            if (!saveRes.ok || json.error) {
              // Vibration + toast unique avec ID fixe (remplace le précédent s'il existe)
              if (navigator.vibrate) navigator.vibrate(500);
              toast.warning(json.error || "Cet IMEI a déjà été scanné", {
                id: "scan-duplicate",
                position: "top-center",
              });
              // Délai avant de débloquer pour éviter le re-scan immédiat du même code
              setTimeout(() => {
                isProcessing.current = false;
              }, 2000);
            } else {
              // ✅ Succès : son + vibration + toast unique + modal
              setScannedCount((prev) => prev + 1);
              setHasScans(true);
              playSuccessBeep();
              if (navigator.vibrate) navigator.vibrate(150);

              toast.success(
                `+1 (${produit.brand || ""} ${produit.model || ""} ${produit.capacity || ""} - Grade ${produit.revvoGrade || "N/A"})`,
                { id: "scan-success", position: "top-center" },
              );

              Quagga.stop();
              setIsScanning(false);
              setShowScanPrompt(true);
              // isProcessing reste true → bloqué jusqu'au prochain scan via continueScanning()
            }
          } catch (err: any) {
            if (err.response?.status === 404) {
              toast.error("IMEI inconnu dans la base", {
                id: "scan-error",
                position: "top-center",
              });
            } else {
              toast.error("Erreur lors de la vérification", {
                id: "scan-error",
                position: "top-center",
              });
            }
            // Délai avant de débloquer pour laisser le message visible
            setTimeout(() => {
              if (isMounted.current) {
                isProcessing.current = false;
              }
            }, 2000);
          }
        });

        // ✅ FIX 1 : Même chose pour onProcessed
        Quagga.offProcessed();
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
  }, [currentInventaireId, scannerKey]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden items-center justify-center">
      {/* Compteur fixe en haut */}
      <div className="fixed top-14 md:top-3 md:left-60 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="bg-indigo-900 backdrop-blur-md px-5 py-2 rounded-full border border-emerald-500/20 shadow-lg">
          <p className="text-sm sm:text-base font-medium text-white/95">
            Appareils scannés :{" "}
            <span className="text-emerald-300 font-semibold">
              {scannedCount}
            </span>
          </p>
        </div>
      </div>

      {error && (
        <div className="w-full max-w-md bg-red-900/70 border border-red-600/50 text-red-100 p-4 rounded-xl mb-4 text-center shadow-lg">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* ZONE DE SCAN AVEC CLÉ */}
      <div className="flex items-center justify-center w-80 px-4 mb-2 md:mb-10">
        <div
          key={scannerKey}
          id="scanner-viewport"
          className={`relative w-full max-w-[85vw] aspect-square bg-black rounded-2xl overflow-hidden border-4 ${isScanning ? "border-emerald-500" : "border-gray-700"} shadow-sm shadow-black/60 transition-all duration-300`}
        />
      </div>

      <div className="text-center mb-4 md:mb-10">
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

      {/* Bouton Résumé */}
      <div className="w-1/3 mx-auto mb-20 z-50 px-5 flex justify-center items-center">
        <div className="flex justify-center items-center max-w-md mx-auto flex-wrap">
          <Link
            href={
              currentInventaireId && hasScans
                ? `/resume?inventaireId=${currentInventaireId}`
                : "#"
            }
          >
            <Button
              className={`w-85 mx-auto px-3 py-2 lg:py-3 lg:px-6 rounded-xl font-semibold text-lg shadow-xl transition text-center md:px-8 ${
                !currentInventaireId || !hasScans
                  ? "opacity-50 cursor-not-allowed bg-indigo-400 text-white/70"
                  : "bg-indigo-600 text-white active:scale-95"
              }`}
              onClick={(e) => {
                if (!currentInventaireId) {
                  e.preventDefault();
                  toast.info("Inventaire non démarré", {
                    position: "top-center",
                  });
                  return;
                }
                if (!hasScans) {
                  e.preventDefault();
                  toast.warning(
                    "Veuillez scanner au moins un appareil pour voir le résumé",
                    { position: "top-center" },
                  );
                  return;
                }
              }}
            >
              Résumé
            </Button>
          </Link>
        </div>
      </div>

      {/* Prompt Scanner à nouveau */}
      {showScanPrompt && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <span className="text-5xl">✅</span>
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">
              Scan réussi !
            </h3>
            <p className="text-zinc-400 mb-8 text-lg">
              Voulez-vous scanner un autre appareil ?
            </p>

            <div className="flex gap-4">
              <Button
                onClick={() => setShowScanPrompt(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3.5 rounded-2xl font-semibold text-base shadow"
              >
                Non
              </Button>
              <Button
                onClick={continueScanning}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-semibold text-base shadow active:scale-95"
              >
                Oui
              </Button>
            </div>
          </div>
        </div>
      )}

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


// "use client";

// import { Suspense, useEffect, useRef, useState } from "react";
// import Quagga from "@ericblade/quagga2";
// import { useRouter, useSearchParams } from "next/navigation";
// import { toast } from "sonner";
// import axios from "axios";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";

// function ScanContent() {
//   const searchParams = useSearchParams();
//   const inventaireIdFromUrl = searchParams.get("inventaireId");

//   const [hasScans, setHasScans] = useState(false);
//   const [scannedCount, setScannedCount] = useState(0);

//   const [currentInventaireId, setCurrentInventaireId] = useState<number | null>(
//     () => {
//       if (inventaireIdFromUrl) return Number(inventaireIdFromUrl);
//       if (typeof window !== "undefined") {
//         const saved = sessionStorage.getItem("currentInventaireId");
//         return saved ? Number(saved) : null;
//       }
//       return null;
//     },
//   );

//   const [isScanning, setIsScanning] = useState(false);
//   const [error, setError] = useState<string>("");
//   const [showScanPrompt, setShowScanPrompt] = useState(false);
//   const [scannerKey, setScannerKey] = useState(0);

//   const router = useRouter();
//   const isMounted = useRef(true);
//   const quaggaInitialized = useRef(false);

//   // ✅ FIX 2 : Synchronise l'inventaireId dans l'URL pour survivre à l'actualisation
//   useEffect(() => {
//     if (currentInventaireId && !inventaireIdFromUrl) {
//       router.replace(`?inventaireId=${currentInventaireId}`);
//     }
//   }, [currentInventaireId, inventaireIdFromUrl, router]);

//   // Recharge le compteur depuis la base à chaque chargement / changement d'inventaire
//   useEffect(() => {
//     if (!currentInventaireId) return;

//     const checkRealCount = async () => {
//       try {
//         const res = await fetch(`/api/inventaire/${currentInventaireId}/count`);
//         if (!res.ok) return;
//         const { count } = await res.json();
//         setScannedCount(count);
//         setHasScans(count > 0);
//       } catch (e) {
//         console.error("Erreur compteur", e);
//       }
//     };

//     checkRealCount();
//   }, [currentInventaireId]);

//   const playSuccessBeep = () => {
//     try {
//       const ctx = new (
//         window.AudioContext || (window as any).webkitAudioContext
//       )();
//       const osc = ctx.createOscillator();
//       const gain = ctx.createGain();
//       osc.connect(gain);
//       gain.connect(ctx.destination);
//       osc.type = "square";
//       osc.frequency.setValueAtTime(1800, ctx.currentTime);
//       osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
//       gain.gain.setValueAtTime(0.4, ctx.currentTime);
//       gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
//       osc.start();
//       osc.stop(ctx.currentTime + 0.12);
//     } catch {}
//   };

//   useEffect(() => {
//     const initInventaire = async () => {
//       if (currentInventaireId) return;
//       try {
//         const res = await fetch("/api/inventaire", { method: "POST" });
//         const data = await res.json();
//         if (data.id) {
//           setCurrentInventaireId(data.id);
//           sessionStorage.setItem("currentInventaireId", String(data.id));
//           toast(`Inventaire #${data.id} démarré`, { position: "top-center" });
//         }
//       } catch {
//         setError("Impossible de démarrer un inventaire");
//       }
//     };
//     initInventaire();
//   }, [currentInventaireId]);

//   const continueScanning = () => {
//     setShowScanPrompt(false);
//     setIsScanning(false);
//     setTimeout(() => {
//       setScannerKey((prev) => prev + 1);
//     }, 180);
//   };

//   useEffect(() => {
//     if (!currentInventaireId) return;

//     const cleanup = () => {
//       isMounted.current = false;
//       if (quaggaInitialized.current) {
//         Quagga.stop();
//         // ✅ FIX 1 : Supprime TOUS les listeners avant de quitter
//         Quagga.offDetected();
//         Quagga.offProcessed();
//         quaggaInitialized.current = false;
//       }

//       document.querySelectorAll("video").forEach((video) => {
//         if (video.srcObject) {
//           (video.srcObject as MediaStream)
//             .getTracks()
//             .forEach((track) => track.stop());
//         }
//       });
//     };

//     isMounted.current = true;

//     const initAndStartScanner = async () => {
//       setError("");
//       setIsScanning(false);

//       if (!navigator.mediaDevices?.getUserMedia) {
//         setError("Caméra non supportée. Utilisez HTTPS.");
//         return;
//       }

//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: { facingMode: "environment" },
//         });
//         stream.getTracks().forEach((t) => t.stop());
//       } catch (err: any) {
//         setError(
//           err.name === "NotAllowedError"
//             ? "Accès caméra refusé"
//             : "Impossible d'accéder à la caméra",
//         );
//         return;
//       }

//       const target = document.querySelector("#scanner-viewport");
//       if (!target) {
//         setError("Conteneur introuvable");
//         return;
//       }

//       try {
//         await new Promise<void>((resolve, reject) => {
//           Quagga.init(
//             {
//               inputStream: {
//                 type: "LiveStream",
//                 target,
//                 constraints: {
//                   width: { ideal: 1280 },
//                   height: { ideal: 720 },
//                   facingMode: "environment",
//                 },
//               },
//               locator: { patchSize: "medium", halfSample: true },
//               numOfWorkers: navigator.hardwareConcurrency
//                 ? Math.min(4, navigator.hardwareConcurrency - 1)
//                 : 2,
//               frequency: 12,
//               decoder: {
//                 readers: [
//                   "ean_reader",
//                   "ean_8_reader",
//                   "upc_reader",
//                   "code_128_reader",
//                   "code_39_reader",
//                 ],
//               },
//               locate: true,
//             },
//             (err) => (err ? reject(err) : resolve()),
//           );
//         });

//         if (!isMounted.current) return;

//         quaggaInitialized.current = true;
//         Quagga.start();
//         setIsScanning(true);

//         // ✅ FIX 1 : Retire l'ancien listener AVANT d'en ajouter un nouveau
//         // Empêche l'accumulation de handlers après chaque scan (cause du ralentissement)
//         Quagga.offDetected();
//         Quagga.onDetected(async (data) => {
//           let code = data?.codeResult?.code?.trim();
//           if (!code) return;
//           code = code.replace(/[^0-9]/g, "");

//           try {
//             const response = await axios.get(
//               `${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE}/product-serialize/${code}`,
//             );
//             const produit = response.data;

//             if (!produit || !produit.imei) {
//               toast.dismiss();
//               toast.error("IMEI non trouvé dans leur système", {
//                 position: "top-center",
//               });
//               return;
//             }

//             const saveRes = await fetch("/api/scan", {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({
//                 imei: code,
//                 inventaireId: currentInventaireId,
//                 produit,
//               }),
//             });

//             const json = await saveRes.json();

//             if (!saveRes.ok || json.error) {
//               toast.dismiss();
//               if (navigator.vibrate) navigator.vibrate(500);
//               toast.warning(json.error || "Cet IMEI a déjà été scanné", {
//                 position: "top-center",
//               });
//             } else {
//               setScannedCount((prev) => prev + 1);
//               setHasScans(true);
//               playSuccessBeep();
//               if (navigator.vibrate) navigator.vibrate(150);

//               toast.dismiss();
//               toast.success(
//                 `+1 (${produit.brand || ""} ${produit.model || ""} ${produit.capacity || ""} - Grade ${produit.revvoGrade || "N/A"})`,
//                 { position: "top-center" },
//               );

//               setShowScanPrompt(true);
//               Quagga.stop();
//               setIsScanning(false);
//               return;
//             }
//           } catch (err: any) {
//             toast.dismiss();
//             if (err.response?.status === 404) {
//               toast.error("IMEI inconnu dans la base", {
//                 position: "top-center",
//               });
//             } else {
//               toast.error("Erreur lors de la vérification", {
//                 position: "top-center",
//               });
//             }
//           }

//           setTimeout(() => {
//             if (isMounted.current) {
//               Quagga.start();
//               setIsScanning(true);
//             }
//           }, 600);
//         });

//         // ✅ FIX 1 : Même chose pour onProcessed
//         Quagga.offProcessed();
//         Quagga.onProcessed((result) => {
//           const ctx = Quagga.canvas?.ctx?.overlay;
//           const canvas = Quagga.canvas?.dom?.overlay;
//           if (!ctx || !canvas) return;

//           const w = parseInt(canvas.getAttribute("width") || "0");
//           const h = parseInt(canvas.getAttribute("height") || "0");
//           ctx.clearRect(0, 0, w, h);

//           if (result?.boxes) {
//             result.boxes
//               .filter((b) => b !== result.box)
//               .forEach((box) => {
//                 Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, ctx, {
//                   color: "rgba(0,255,0,0.4)",
//                   lineWidth: 2,
//                 });
//               });
//           }
//           if (result?.box) {
//             Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, ctx, {
//               color: "#00aaff",
//               lineWidth: 3,
//             });
//           }
//           if (result?.codeResult?.code) {
//             Quagga.ImageDebug.drawPath(result.line, { x: "x", y: "y" }, ctx, {
//               color: "#ff3366",
//               lineWidth: 4,
//             });
//           }
//         });
//       } catch (err: any) {
//         setError("Échec initialisation : " + (err.message || "Erreur"));
//       }
//     };

//     const timer = setTimeout(initAndStartScanner, 300);

//     return () => {
//       clearTimeout(timer);
//       cleanup();
//     };
//   }, [currentInventaireId, scannerKey]);

//   return (
//     <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden items-center justify-center">
//       {/* Compteur fixe en haut */}
//       <div className="fixed top-14 md:top-3 md:left-60 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
//         <div className="bg-indigo-900 backdrop-blur-md px-5 py-2 rounded-full border border-emerald-500/20 shadow-lg">
//           <p className="text-sm sm:text-base font-medium text-white/95">
//             Appareils scannés :{" "}
//             <span className="text-emerald-300 font-semibold">
//               {scannedCount}
//             </span>
//           </p>
//         </div>
//       </div>

//       {error && (
//         <div className="w-full max-w-md bg-red-900/70 border border-red-600/50 text-red-100 p-4 rounded-xl mb-4 text-center shadow-lg">
//           <p className="font-medium">{error}</p>
//         </div>
//       )}

//       {/* ZONE DE SCAN AVEC CLÉ */}
//       <div className="flex items-center justify-center w-80 px-4 mb-2 md:mb-10">
//         <div
//           key={scannerKey}
//           id="scanner-viewport"
//           className={`relative w-full max-w-[85vw] aspect-square bg-black rounded-2xl overflow-hidden border-4 ${isScanning ? "border-emerald-500" : "border-gray-700"} shadow-sm shadow-black/60 transition-all duration-300`}
//         />
//       </div>

//       <div className="text-center mb-4 md:mb-10">
//         {isScanning ? (
//           <p className="text-emerald-400 font-medium text-lg animate-pulse">
//             Scanning actif...
//           </p>
//         ) : (
//           <p className="text-amber-400 font-medium">
//             Préparation du scanner...
//           </p>
//         )}
//       </div>

//       {/* Bouton Résumé */}
//       <div className="w-1/3 mx-auto mb-20 z-50 px-5 flex justify-center items-center">
//         <div className="flex justify-center items-center max-w-md mx-auto flex-wrap">
//           <Link
//             href={
//               currentInventaireId && hasScans
//                 ? `/resume?inventaireId=${currentInventaireId}`
//                 : "#"
//             }
//           >
//             <Button
//               className={`w-85 mx-auto px-3 py-2 lg:py-3 lg:px-6 rounded-xl font-semibold text-lg shadow-xl transition text-center md:px-8 ${
//                 !currentInventaireId || !hasScans
//                   ? "opacity-50 cursor-not-allowed bg-indigo-400 text-white/70"
//                   : "bg-indigo-600 text-white active:scale-95"
//               }`}
//               onClick={(e) => {
//                 if (!currentInventaireId) {
//                   e.preventDefault();
//                   toast.info("Inventaire non démarré", {
//                     position: "top-center",
//                   });
//                   return;
//                 }
//                 if (!hasScans) {
//                   e.preventDefault();
//                   toast.warning(
//                     "Veuillez scanner au moins un appareil pour voir le résumé",
//                     { position: "top-center" },
//                   );
//                   return;
//                 }
//               }}
//             >
//               Résumé
//             </Button>
//           </Link>
//         </div>
//       </div>

//       {/* Prompt Scanner à nouveau */}
//       {showScanPrompt && (
//         <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6">
//           <div className="bg-zinc-900 border border-emerald-500/30 rounded-3xl w-full max-w-sm p-8 text-center shadow-2xl">
//             <div className="mx-auto mb-6 w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
//               <span className="text-5xl">✅</span>
//             </div>
//             <h3 className="text-2xl font-semibold text-white mb-3">
//               Scan réussi !
//             </h3>
//             <p className="text-zinc-400 mb-8 text-lg">
//               Voulez-vous scanner un autre appareil ?
//             </p>

//             <div className="flex gap-4">
//               <Button
//                 onClick={() => setShowScanPrompt(false)}
//                 className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3.5 rounded-2xl font-semibold text-base shadow"
//               >
//                 Non
//               </Button>
//               <Button
//                 onClick={continueScanning}
//                 className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-semibold text-base shadow active:scale-95"
//               >
//                 Oui
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}

//       <style jsx global>{`
//         html,
//         body,
//         #__next {
//           height: 100%;
//           overflow: hidden;
//         }
//         #scanner-viewport {
//           position: relative;
//         }
//         #scanner-viewport canvas.drawingBuffer {
//           position: absolute;
//           inset: 0;
//           width: 100%;
//           height: 100%;
//         }
//         #scanner-viewport video {
//           width: 100% !important;
//           height: 100% !important;
//           object-fit: cover;
//         }
//       `}</style>
//     </div>
//   );
// }

// export default function ScannerPage() {
//   return (
//     <Suspense
//       fallback={
//         <div className="h-screen bg-background flex items-center justify-center text-foreground">
//           <div className="text-center">
//             <div className="w-16 h-16 border-4 border-t-4 border-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
//             <p className="text-xl font-medium">Initialisation du scanner...</p>
//           </div>
//         </div>
//       }
//     >
//       <ScanContent />
//     </Suspense>
//   );
// }

// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import { Suspense, useEffect, useRef, useState } from "react";
// import Quagga from "@ericblade/quagga2";
// import { useRouter, useSearchParams } from "next/navigation";
// import { toast } from "sonner"
// import axios from "axios";
// import Link from "next/link";
// import { Button } from "@/components/ui/button"

// // Composant interne qui contient toute la logique (protégé par Suspense)
// function ScanContent() {
//   const searchParams = useSearchParams();
//   const inventaireIdFromUrl = searchParams.get("inventaireId");
//   // Ajoute cette ligne avec les autres states
// const [hasScans, setHasScans] = useState(false);

//   const [scannedCount, setScannedCount] = useState(0);
//   const [currentInventaireId, setCurrentInventaireId] = useState<number | null>(
//     inventaireIdFromUrl ? Number(inventaireIdFromUrl) : null,
//   );
//   const [isScanning, setIsScanning] = useState(false);
//   const [error, setError] = useState<string>("");
//   const router = useRouter();
//   const isMounted = useRef(true);
//   const quaggaInitialized = useRef(false);

//     useEffect(() => {
//   if (!currentInventaireId) return;

//   const checkRealCount = async () => {
//     try {
//       const res = await fetch(`/api/inventaire/${currentInventaireId}/count`);
//       if (!res.ok) return;
//       const { count } = await res.json();
//       setScannedCount(count);
//       setHasScans(count > 0);
//     } catch {}
//   };

//   checkRealCount();
// }, [currentInventaireId]);

//   // Son de succès (inchangé)
//   const playSuccessBeep = () => {
//     try {
//       const ctx = new (
//         window.AudioContext || (window as any).webkitAudioContext
//       )();
//       const osc = ctx.createOscillator();
//       const gain = ctx.createGain();
//       osc.connect(gain);
//       gain.connect(ctx.destination);
//       osc.type = "square";
//       osc.frequency.setValueAtTime(1800, ctx.currentTime);
//       osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
//       gain.gain.setValueAtTime(0.4, ctx.currentTime);
//       gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
//       osc.start();
//       osc.stop(ctx.currentTime + 0.12);
//     } catch {}
//   };

//   // Si pas d'inventaireId dans l'URL, en créer un nouveau (inchangé)
//   useEffect(() => {
//     const initInventaire = async () => {
//       if (currentInventaireId) return;

//       try {
//         const res = await fetch("/api/inventaire", { method: "POST" });
//         const data = await res.json();
//         if (data.id) {
//           setCurrentInventaireId(data.id);
//           toast(`Inventaire #${data.id} démarré`,{ position: "top-center" });
//           // toast.info(`Inventaire #${data.id} démarré`, { autoClose: 1800 });
//         }
//       } catch {
//         setError("Impossible de démarrer un inventaire");
//       }
//     };

//     initInventaire();
//   }, [currentInventaireId]);

//   useEffect(() => {
//     if (!currentInventaireId) return;

//     const cleanup = () => {
//       isMounted.current = false;
//       if (quaggaInitialized.current) {
//         Quagga.stop();
//         Quagga.offDetected();
//         Quagga.offProcessed();
//         quaggaInitialized.current = false;
//       }
//     };

//     const initAndStartScanner = async () => {
//       setError("");
//       setIsScanning(false);

//       if (!navigator.mediaDevices?.getUserMedia) {
//         setError("Caméra non supportée. Utilisez HTTPS.");
//         return;
//       }

//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: { facingMode: "environment" },
//         });
//         stream.getTracks().forEach((t) => t.stop());
//       } catch (err: any) {
//         setError(
//           err.name === "NotAllowedError"
//             ? "Accès caméra refusé"
//             : "Impossible d’accéder à la caméra",
//         );
//         return;
//       }

//       const target = document.querySelector("#scanner-viewport");
//       if (!target) {
//         setError("Conteneur introuvable");
//         return;
//       }

//       try {
//         await new Promise<void>((resolve, reject) => {
//           Quagga.init(
//             {
//               inputStream: {
//                 type: "LiveStream",
//                 target,
//                 constraints: {
//                   width: { ideal: 1280 },
//                   height: { ideal: 720 },
//                   facingMode: "environment",
//                 },
//               },
//               locator: { patchSize: "medium", halfSample: true },
//               numOfWorkers: navigator.hardwareConcurrency
//                 ? Math.min(4, navigator.hardwareConcurrency - 1)
//                 : 2,
//               frequency: 12,
//               decoder: {
//                 readers: [
//                   "ean_reader",
//                   "ean_8_reader",
//                   "upc_reader",
//                   "code_128_reader",
//                   "code_39_reader",
//                 ],
//               },
//               locate: true,
//             },
//             (err) => (err ? reject(err) : resolve()),
//           );
//         });

//         if (!isMounted.current) return;

//         quaggaInitialized.current = true;
//         Quagga.start();
//         setIsScanning(true);

//         Quagga.onDetected(async (data) => {
//           let code = data?.codeResult?.code?.trim();
//           if (!code) return;

//           code = code.replace(/[^0-9]/g, "");

//           try {
//             // Appel unique à leur API
//             const response = await axios.get(
//               `${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE}/product-serialize/${code}`,
//             );

//             const produit = response.data;

//             if (!produit || !produit.imei) {
//               toast.error("IMEI non trouvé dans leur système",{ position: "top-center" });
//               // toast.error("IMEI non trouvé dans leur système", {
//               //   autoClose: 2000,
//               // });
//               return;
//             }

//             // Envoie au back : IMEI + inventaireId + l'objet produit complet
//             const saveRes = await fetch("/api/scan", {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({
//                 imei: code,
//                 inventaireId: currentInventaireId,
//                 produit, // ← on envoie tout l'objet reçu
//               }),
//             });

//             const json = await saveRes.json();

//             if (!saveRes.ok || json.error) {
//               toast.warning(json.error || "Erreur ajout (déjà scanné ?)",{ position: "top-center" })
//               // toast.error(json.error || "Erreur ajout (déjà scanné ?)", {
//               //   autoClose: 2000,
//               // });
//               return;
//             }

//             // Succès
//             setScannedCount((prev) => prev + 1);
//             setHasScans(true);               // ← ajoute cette ligne
//             playSuccessBeep();
//             if (navigator.vibrate) navigator.vibrate(150);
//             toast.success(`+1 (${produit.brand || ""} ${produit.model || ""} ${produit.capacity || ""} - Grade ${produit.revvoGrade || "N/A"})`,{ position: "top-center" })
//             // toast.success(
//             //   `+1 (${produit.brand || ""} ${produit.model || ""} ${produit.capacity || ""} - Grade ${produit.revvoGrade || "N/A"})`,
//             //   { autoClose: 800 },
//             // );
//           } catch (err: any) {
//             if (err.response?.status === 404) {

//               toast.error("IMEI inconnu dans la base",{ position: "top-center" });
//             } else {
//               toast.error("Erreur lors de la vérification",{ position: "top-center" });
//             }
//             console.error("Erreur API externe:", err);
//           }

//           // Re-démarre le scanner (inchangé)
//           setTimeout(() => {
//             if (isMounted.current) {
//               Quagga.start();
//               setIsScanning(true);
//             }
//           }, 600);
//         });

//         // Overlay visuel (inchangé)
//         Quagga.onProcessed((result) => {
//           const ctx = Quagga.canvas?.ctx?.overlay;
//           const canvas = Quagga.canvas?.dom?.overlay;
//           if (!ctx || !canvas) return;

//           const w = parseInt(canvas.getAttribute("width") || "0");
//           const h = parseInt(canvas.getAttribute("height") || "0");
//           ctx.clearRect(0, 0, w, h);

//           if (result?.boxes) {
//             result.boxes
//               .filter((b) => b !== result.box)
//               .forEach((box) => {
//                 Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, ctx, {
//                   color: "rgba(0,255,0,0.4)",
//                   lineWidth: 2,
//                 });
//               });
//           }
//           if (result?.box) {
//             Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, ctx, {
//               color: "#00aaff",
//               lineWidth: 3,
//             });
//           }
//           if (result?.codeResult?.code) {
//             Quagga.ImageDebug.drawPath(result.line, { x: "x", y: "y" }, ctx, {
//               color: "#ff3366",
//               lineWidth: 4,
//             });
//           }
//         });
//       } catch (err: any) {
//         setError("Échec initialisation : " + (err.message || "Erreur"));
//       }
//     };

//     const timer = setTimeout(initAndStartScanner, 300);

//     return () => {
//       clearTimeout(timer);
//       cleanup();
//     };
//   }, [router, currentInventaireId]);

//   const restartScanner = () => {
//     setScannedCount(0);
//     setHasScans(false);
//     setError("");
//     setIsScanning(false);
//   };

//   return (
//     <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden items-center justify-center">
//       {/* <ToastContainer
//         theme="colored"
//         position="top-center"
//         autoClose={800}
//         hideProgressBar
//       /> */}

//       {/* Compteur fixe en haut – gardé tel quel */}
//       <div className="fixed top-14 md:top-3 md:left-60 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
//         <div className="bg-indigo-900 backdrop-blur-md px-5 py-2 rounded-full border border-emerald-500/20 shadow-lg">
//           <p className="text-sm sm:text-base font-medium text-white/95">
//             Appareils scannés :{" "}
//             <span className="text-emerald-300 font-semibold">
//               {scannedCount}
//             </span>
//           </p>
//         </div>
//       </div>

//       {/* <div className="w-full max-w-md my-5 text-center flex justify-center items-center">
//         <h1 className="text-2xl font-bold text-center tracking-tight">
//           Scanner Code-barres
//         </h1>
//       </div> */}

//       {error && (
//         <div className="w-full max-w-md bg-red-900/70 border border-red-600/50 text-red-100 p-4 rounded-xl mb-4 text-center shadow-lg">
//           <p className="font-medium">{error}</p>
//         </div>
//       )}

//       {/* Zone de scan : carrée, très grande, centrée – gardée telle quelle */}
//       <div className="flex items-center justify-center w-88 px-4 mb-2 md:mb-10">
//         <div
//           id="scanner-viewport"
//           className={`relative w-full max-w-[85vw] aspect-square bg-black rounded-2xl overflow-hidden border-4 ${isScanning ? "border-emerald-500" : "border-gray-700"} shadow-sm shadow-black/60 transition-all duration-300`}
//         />
//       </div>

//       <div className="text-center mb-4 md:mb-10">
//         {isScanning ? (
//           <p className="text-emerald-400 font-medium text-lg animate-pulse">
//             Scanning actif...
//           </p>
//         ) : (
//           <p className="text-amber-400 font-medium">
//             Préparation du scanner...
//           </p>
//         )}
//       </div>

//       {/* Boutons fixes en bas – gardés tels quels */}
//       <div className="w-1/3 mx-auto mb-20 z-50  px-5 flex justify-center items-center  ">
//         <div className="flex justify-center items-center max-w-md mx-auto flex-wrap">
//           <Link href={
//             currentInventaireId && hasScans
//               ? `/resume?inventaireId=${currentInventaireId}`
//               : "#"
//           }>
//             <Button
//           className={`w-85 mx-auto px-3 py-2 lg:py-3 lg:px-6  rounded-xl font-semibold text-lg shadow-xl transition text-center md:px-8 ${
//             !currentInventaireId || !hasScans
//               ? "opacity-50 cursor-not-allowed bg-indigo-400 text-white/70"
//               : "bg-indigo-600 text-white active:scale-95"
//           }`}
//           onClick={(e) => {
//             if (!currentInventaireId) {
//               e.preventDefault();
//               toast.info("Inventaire non démarré",{ position: "top-center" });
//               return;
//             }

//             if (!hasScans) {
//               e.preventDefault();
//               toast.warning("Veuillez scanner au moins un appareil pour voir le résumé",{ position: "top-center" });
//               return;
//             }

//             // Si tout est OK → navigation normale
//           }}
//         >
//           Résumé
//         </Button>
//           </Link>

//         </div>
//       </div>

//       <style jsx global>{`
//         html,
//         body,
//         #__next {
//           height: 100%;
//           overflow: hidden;
//         }
//         #scanner-viewport {
//           position: relative;
//         }
//         #scanner-viewport canvas.drawingBuffer {
//           position: absolute;
//           inset: 0;
//           width: 100%;
//           height: 100%;
//         }
//         #scanner-viewport video {
//           width: 100% !important;
//           height: 100% !important;
//           object-fit: cover;
//         }
//       `}</style>
//     </div>
//   );
// }

// // Page principale avec Suspense
// export default function ScannerPage() {
//   return (
//     <Suspense
//       fallback={
//         <div className="h-screen bg-background flex items-center justify-center text-foreground">
//           <div className="text-center">
//             <div className="w-16 h-16 border-4 border-t-4 border-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
//             <p className="text-xl font-medium">Initialisation du scanner...</p>
//           </div>
//         </div>
//       }
//     >
//       <ScanContent />
//     </Suspense>
//   );
// }
