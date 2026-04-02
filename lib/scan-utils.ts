import axios from "axios";

export async function processScan(
  code: string,
  type: "BARCODE" | "QR",
  inventaireId: number
) {
  let imei = code.trim();

  // Traitement spécifique au QR code (JSON, URL, ou chaîne brute)
  if (type === "QR") {
    try {
      // 1. Essai JSON
      const parsed = JSON.parse(imei);
      if (parsed.imei) {
        imei = String(parsed.imei).replace(/[^0-9]/g, "");
      } else if (parsed.serialNumber || parsed.serial) {
        imei = String(parsed.serialNumber || parsed.serial).replace(/[^0-9]/g, "");
      }
    } catch {
      // 2. Essai URL (ex: https://.../imei=1234567890)
      const urlMatch = imei.match(/[?&/]imei[=:/]([0-9]{14,16})/i);
      if (urlMatch?.[1]) {
        imei = urlMatch[1];
      } else {
        // 3. Chercher un bloc de chiffres de longueur IMEI valide (14–16 chiffres)
        // On privilégie 15 chiffres (IMEI standard), sinon 14 ou 16
        const allMatches = imei.match(/\d{14,16}/g) || [];
        const best =
          allMatches.find((m) => m.length === 15) ||
          allMatches.find((m) => m.length === 14) ||
          allMatches.find((m) => m.length === 16);
        if (best) {
          imei = best;
        } else {
          // Dernier recours : supprimer les non-chiffres
          imei = imei.replace(/[^0-9]/g, "");
        }
      }
    }
  } else {
    // Mode BARCODE : uniquement des chiffres
    imei = imei.replace(/[^0-9]/g, "");
  }

  if (!imei) {
    throw new Error("Impossible d'extraire un IMEI valide depuis ce scan");
  }

  // 1. Appel API externe pour enrichir le produit
  const response = await axios.get(`/api/product?code=${imei}`);
  const produit = response.data;

  if (!produit || !produit.imei) {
    const apiError: any = new Error("IMEI non trouvé dans leur système");
    apiError.status = 404;
    throw apiError;
  }

  // 2. Sauvegarde en base de données
  const saveRes = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imei,
      inventaireId,
      produit,
      scanType: type,
    }),
  });

  const json = await saveRes.json();

  if (!saveRes.ok || json.error) {
    throw new Error(json.error || "Cet IMEI a déjà été scanné");
  }

  return { produit, scan: json.scan };
}
