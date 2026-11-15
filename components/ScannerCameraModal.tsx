"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  X,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Image as ImageIcon,
  Sparkles,
  QrCode,
  FileText,
  Calendar,
  Layers,
  Tag,
  Loader2,
  Check,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  parserCodePharma,
  parserTexteBoiteMedicament,
  CodePharmaParse,
} from "@/lib/pharmacie/code-parser";
import { chercherDansDictionnaire } from "@/lib/pharmacie/dictionnaire-medicaments";

interface ScannerCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeDetecte: (code: string, parseResult?: CodePharmaParse) => void;
  titre?: string;
  sousTitre?: string;
  modeInitial?: "auto" | "datamatrix" | "ocr";
}

export default function ScannerCameraModal({
  isOpen,
  onClose,
  onCodeDetecte,
  titre = "Scanner un Médicament",
  sousTitre = "Pointez la caméra vers le Code QR, DataMatrix GS1 ou Code-barres",
  modeInitial = "auto",
}: ScannerCameraModalProps) {
  const containerId = "d-pharma-qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scanMode, setScanMode] = useState<"auto" | "datamatrix" | "ocr">(modeInitial);
  const [isStarting, setIsStarting] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchSupporte, setTorchSupporte] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [dernierCodeScanne, setDernierCodeScanne] = useState<string | null>(null);
  const [scanReussiAnim, setScanReussiAnim] = useState(false);
  const [detailsExtraits, setDetailsExtraits] = useState<CodePharmaParse | null>(null);

  // État OCR
  const [ocrEnCours, setOcrEnCours] = useState(false);
  const [ocrProgression, setOcrProgression] = useState<string | null>(null);
  const [apercuOcr, setApercuOcr] = useState<CodePharmaParse | null>(null);

  // Bip sonore de confirmation
  const biperScan = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // Note C6
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(80);
      }
    } catch {
      // Audio non supporté
    }
  }, []);

  // Déclencher le succès lors de la lecture d'un code
  const traiterCodeDetecte = useCallback(
    (codeBrut: string, parseForce?: Partial<CodePharmaParse>) => {
      const code = codeBrut.trim();
      if (!code && !parseForce?.code_barres) return;
      if (code && code === dernierCodeScanne && !parseForce) return;

      let parsed = parserCodePharma(code);
      if (parseForce) {
        parsed = {
          ...parsed,
          ...parseForce,
          code_barres: parseForce.code_barres || parsed.code_barres || code,
        };
      }

      // Compléter avec le dictionnaire pharmaceutique si le nom, DCI ou prix manque
      if (parsed.code_barres) {
        const refDico = chercherDansDictionnaire(parsed.code_barres);
        if (refDico) {
          if (!parsed.nom) parsed.nom = refDico.nom;
          if (!parsed.prix_vente && refDico.prix_vente_indicatif) {
            parsed.prix_vente = refDico.prix_vente_indicatif;
          }
          if (!parsed.type_produit) parsed.type_produit = refDico.type_produit;
          if (!parsed.principe_actif && refDico.principe_actif) parsed.principe_actif = refDico.principe_actif;
          if (!parsed.forme && refDico.forme) parsed.forme = refDico.forme;
          if (!parsed.dosage && refDico.dosage) parsed.dosage = refDico.dosage;
        }
      }

      setDernierCodeScanne(code || parsed.code_barres);
      setDetailsExtraits(parsed);
      setScanReussiAnim(true);
      biperScan();

      setTimeout(() => {
        onCodeDetecte(parsed.code_barres || code, parsed);
        setScanReussiAnim(false);
        setDetailsExtraits(null);
        onClose();
      }, 700);

      setTimeout(() => {
        setDernierCodeScanne(null);
      }, 1500);
    },
    [dernierCodeScanne, biperScan, onCodeDetecte, onClose]
  );

  // Formats supportés selon le mode choisi
  const getFormats = (mode: "auto" | "datamatrix" | "ocr") => {
    if (mode === "datamatrix") {
      return [
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];
    }
    return [
      Html5QrcodeSupportedFormats.DATA_MATRIX,
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
    ];
  };

  // Démarrage du scanner Html5Qrcode
  useEffect(() => {
    if (!isOpen) return;

    let estMonte = true;
    setIsStarting(true);
    setErreur(null);

    const formatsToSupport = getFormats(scanMode);

    const demarrerScanner = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 80));
        if (!estMonte) return;

        const conteneur = document.getElementById(containerId);
        if (!conteneur) return;

        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
            scannerRef.current.clear();
          } catch { }
          scannerRef.current = null;
        }

        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport,
          verbose: false,
        });
        scannerRef.current = scanner;

        const isSquare = scanMode === "datamatrix";
        const config = {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            if (isSquare) {
              const size = Math.max(200, Math.floor(minEdge * 0.72));
              return { width: size, height: size };
            }
            const w = Math.max(230, Math.floor(minEdge * 0.8));
            const h = Math.max(160, Math.floor(minEdge * 0.55));
            return { width: w, height: h };
          },
          aspectRatio: 1.333333,
        };

        // Paramètres caméra pour décoder les codes haute précision
        const cameraConfig: any = {
          facingMode,
        };

        await scanner.start(
          cameraConfig,
          config,
          (decodedText) => {
            if (estMonte) {
              traiterCodeDetecte(decodedText);
            }
          },
          () => { }
        );

        if (estMonte) {
          setCameraActive(true);
          setIsStarting(false);

          try {
            const capabilities: any = scanner.getRunningTrackCameraCapabilities();
            if (capabilities && capabilities.torchFeature().isSupported()) {
              setTorchSupporte(true);
            } else {
              setTorchSupporte(false);
            }
          } catch {
            setTorchSupporte(false);
          }
        }
      } catch (err: any) {
        console.warn("Erreur démarrage caméra Html5Qrcode:", err);
        if (!estMonte) return;
        setIsStarting(false);
        setCameraActive(false);

        let msg = "Impossible d'accéder au flux direct de la caméra.";
        if (
          err?.name === "NotAllowedError" ||
          err?.name === "PermissionDeniedError" ||
          String(err).includes("Permission")
        ) {
          msg = "Permission caméra refusée. Veuillez autoriser l'accès à la caméra dans votre navigateur.";
        } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
          msg = "Aucune caméra détectée sur cet appareil.";
        } else {
          msg = `Accès caméra restreint (${err?.message || err}). Vous pouvez prendre une photo directe avec le bouton ci-dessous.`;
        }
        setErreur(msg);
      }
    };

    demarrerScanner();

    return () => {
      estMonte = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
              scannerRef.current?.clear();
              scannerRef.current = null;
            }).catch(() => { });
          } else {
            scannerRef.current.clear();
            scannerRef.current = null;
          }
        } catch { }
      }
      setCameraActive(false);
      setTorchActive(false);
    };
  }, [isOpen, facingMode, scanMode, traiterCodeDetecte]);

  // Basculer la torche (flash)
  const toggleTorch = async () => {
    if (!scannerRef.current || !torchSupporte) return;
    try {
      const nextTorch = !torchActive;
      const capabilities: any = scannerRef.current.getRunningTrackCameraCapabilities();
      if (capabilities && capabilities.torchFeature().isSupported()) {
        await capabilities.torchFeature().apply(nextTorch);
        setTorchActive(nextTorch);
      }
    } catch (e) {
      console.warn("Erreur activation torche:", e);
    }
  };

  // Basculer caméra avant / arrière
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Traitement intelligent d'une photo / image (Code-barres + OCR Boîte)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErreur(null);
    setOcrEnCours(true);
    setOcrProgression("Analyse des codes-barres & QR...");

    try {
      let barcodeResult: string | null = null;
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = scanner;
      }

      // 1. Essai de scan de code-barres / DataMatrix
      try {
        barcodeResult = await scanner.scanFile(file, true);
      } catch {
        // Pas de code-barres net détecté, on continue vers l'OCR textuel
      }

      let merged: CodePharmaParse = {
        raw: barcodeResult || "",
        code_barres: barcodeResult || "",
        format: "standard",
      };

      if (barcodeResult) {
        merged = parserCodePharma(barcodeResult);
      }

      // 2. Reconnaissance optique du texte imprimé (OCR)
      setOcrProgression("Lecture du texte sur la boîte (Lot, Péremption, Prix)...");
      try {
        const { recognize } = await import("tesseract.js");
        const ocrResult = await recognize(file, "fra+eng", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setOcrProgression(`Lecture du texte (${Math.round((m.progress || 0) * 100)}%)...`);
            }
          },
        });

        const texteExtrait = ocrResult?.data?.text || "";
        if (texteExtrait.trim()) {
          const parsedOcr = parserTexteBoiteMedicament(texteExtrait);
          merged = {
            raw: merged.raw || texteExtrait,
            code_barres: merged.code_barres || parsedOcr.code_barres || "",
            nom: merged.nom || parsedOcr.nom,
            prix_vente: merged.prix_vente || parsedOcr.prix_vente,
            lot: merged.lot || parsedOcr.lot,
            date_peremption: merged.date_peremption || parsedOcr.date_peremption,
            type_produit: merged.type_produit || parsedOcr.type_produit,
            format: merged.format || "standard",
          };
        }
      } catch (ocrErr) {
        console.warn("OCR tesseract non disponible ou interrompu:", ocrErr);
      }

      // 3. Si on a trouvé un code ou un nom, compléter avec le dictionnaire
      if (merged.code_barres || merged.nom) {
        const refDico = chercherDansDictionnaire(merged.code_barres || merged.nom || "");
        if (refDico) {
          if (!merged.nom) merged.nom = refDico.nom;
          if (!merged.prix_vente && refDico.prix_vente_indicatif) {
            merged.prix_vente = refDico.prix_vente_indicatif;
          }
          if (!merged.type_produit) merged.type_produit = refDico.type_produit;
          if (!merged.principe_actif && refDico.principe_actif) merged.principe_actif = refDico.principe_actif;
          if (!merged.forme && refDico.forme) merged.forme = refDico.forme;
          if (!merged.dosage && refDico.dosage) merged.dosage = refDico.dosage;
        }
      }

      setOcrEnCours(false);
      setOcrProgression(null);

      // Si des informations clés ont été trouvées, afficher l'aperçu pour validation
      if (merged.code_barres || merged.nom || merged.lot || merged.date_peremption || merged.prix_vente) {
        setApercuOcr(merged);
      } else {
        setErreur("Aucun code-barres ni texte pharmaceutique net détecté. Rapprochez la boîte et veillez à un bon éclairage.");
      }
    } catch (err: any) {
      console.warn("Erreur globale handlePhotoUpload:", err);
      setOcrEnCours(false);
      setOcrProgression(null);
      setErreur("Impossible de lire l'image. Veuillez réessayer avec une photo plus nette.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const validerApercuOcr = () => {
    if (!apercuOcr) return;
    traiterCodeDetecte(apercuOcr.code_barres || "", apercuOcr);
    setApercuOcr(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-lg bg-surface border border-surface-border rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* BANDEAU HAUT */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-foreground">{titre}</h3>
              <p className="text-xs text-foreground-muted hidden sm:block">{sousTitre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SÉLECTEUR DE MODE DE SCAN */}
        <div className="grid grid-cols-2 p-2 bg-background/60 gap-1.5 border-b border-surface-border">
          <button
            type="button"
            onClick={() => setScanMode("datamatrix")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${scanMode === "datamatrix"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-foreground-muted hover:text-foreground hover:bg-surface"
              }`}
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span className="truncate">DataMatrix 2D (Lot + Exp)</span>
          </button>

          <button
            type="button"
            onClick={() => setScanMode("auto")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${scanMode === "auto"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-foreground-muted hover:text-foreground hover:bg-surface"
              }`}
          >
            <ScanLine className="w-4 h-4 shrink-0" />
            <span className="truncate">Code-barres 1D / Tous</span>
          </button>
        </div>

        {/* ZONE DE SCAN DIRECT EN DIRECT (HTML5-QRCODE) */}
        <div className="relative w-full bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
          {/* Conteneur DOM pour Html5Qrcode */}
          <div
            id={containerId}
            className="w-full h-full object-cover flex items-center justify-center [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
          />

          {/* Spinner de chargement du flux caméra */}
          {isStarting && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 text-white text-xs z-10">
              <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Démarrage du flux caméra haute précision...</span>
            </div>
          )}

          {/* Spinner / Barre de progression OCR */}
          {ocrEnCours && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 text-white text-xs z-30 p-6 text-center">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <div className="font-bold text-sm text-emerald-300">
                {ocrProgression || "Analyse de la boîte..."}
              </div>
              <p className="text-[11px] text-white/70 max-w-xs">
                Extraction intelligente du Code-barres, Nom, Numéro de Lot, Date de Péremption et Prix...
              </p>
            </div>
          )}

          {/* VISEUR INTERACTIF & ANIMATION LASER */}
          {cameraActive && !isStarting && !ocrEnCours && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
              <div
                className={`relative rounded-2xl border-2 transition-all duration-300 ${scanMode === "datamatrix"
                    ? "w-48 h-48 sm:w-56 sm:h-56"
                    : "w-64 h-44 sm:w-72 sm:h-48"
                  } ${scanReussiAnim
                    ? "border-emerald-400 bg-emerald-400/25 scale-105 shadow-2xl shadow-emerald-500/50"
                    : "border-white/50 shadow-lg"
                  }`}
              >
                {/* Coins de cadrage */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Laser de balayage */}
                {!scanReussiAnim && (
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-[scannerLaser_2s_ease-in-out_infinite]" />
                )}

                {/* Badge visuel scan réussi */}
                {scanReussiAnim && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-white bg-emerald-700/75 backdrop-blur-sm rounded-2xl text-center">
                    <CheckCircle2 className="w-9 h-9 text-emerald-300 animate-bounce mb-1" />
                    <span className="font-bold text-xs bg-black/70 px-3 py-1 rounded-full text-emerald-200">
                      Médicament Identifié !
                    </span>
                    {detailsExtraits && (
                      <div className="mt-2 text-xs bg-black/85 p-2 rounded-xl border border-emerald-400/30 max-w-full space-y-1">
                        {detailsExtraits.nom && (
                          <div className="font-bold text-white truncate max-w-[210px] sm:max-w-[240px]">
                            {detailsExtraits.nom}
                          </div>
                        )}
                        <div className="text-[11px] text-emerald-300 font-mono">
                          {detailsExtraits.code_barres}
                        </div>
                        {(detailsExtraits.lot || detailsExtraits.date_peremption || detailsExtraits.prix_vente) && (
                          <div className="flex flex-wrap items-center justify-center gap-1 text-[10px] text-white/95 pt-0.5">
                            {detailsExtraits.lot && (
                              <span className="bg-white/20 px-1.5 py-0.5 rounded font-mono">
                                Lot: {detailsExtraits.lot}
                              </span>
                            )}
                            {detailsExtraits.date_peremption && (
                              <span className="bg-white/20 px-1.5 py-0.5 rounded font-mono">
                                Exp: {detailsExtraits.date_peremption}
                              </span>
                            )}
                            {detailsExtraits.prix_vente && (
                              <span className="bg-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
                                {detailsExtraits.prix_vente} F
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message guide sous le viseur */}
              {!scanReussiAnim && (
                <div className="mt-3 bg-black/75 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full text-[11px] text-center font-medium shadow">
                  {scanMode === "datamatrix"
                    ? "💡 Visez le code carré 2D pour capturer Code + Lot + Péremption"
                    : "💡 Alignez le code-barres dans le viseur"}
                </div>
              )}
            </div>
          )}

          {/* Modal / Aperçu de confirmation OCR */}
          {apercuOcr && (
            <div className="absolute inset-0 bg-black/95 z-30 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto text-white">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-emerald-300">
                      Informations Détectées sur la Boîte
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApercuOcr(null)}
                    className="p-1 rounded-lg text-white/70 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-surface/10 border border-white/10 rounded-2xl p-3.5 space-y-2.5 text-xs">
                  {apercuOcr.nom && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] text-white/60">Nom de l'article :</div>
                        <div className="font-bold text-sm text-white">{apercuOcr.nom}</div>
                      </div>
                    </div>
                  )}

                  {apercuOcr.code_barres && (
                    <div className="flex items-start gap-2">
                      <ScanLine className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] text-white/60">Code-barres / CIP :</div>
                        <div className="font-mono text-emerald-300 font-semibold">
                          {apercuOcr.code_barres}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                    <div>
                      <div className="text-[10px] text-white/60 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-emerald-400" />
                        <span>Numéro de Lot :</span>
                      </div>
                      <div className="font-mono font-bold text-white text-xs mt-0.5">
                        {apercuOcr.lot || <span className="text-white/40 italic">Non détecté</span>}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-white/60 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        <span>Date Péremption :</span>
                      </div>
                      <div className="font-mono font-bold text-white text-xs mt-0.5">
                        {apercuOcr.date_peremption || <span className="text-white/40 italic">Non détectée</span>}
                      </div>
                    </div>
                  </div>

                  {apercuOcr.prix_vente && (
                    <div className="pt-1 border-t border-white/10 flex items-center justify-between">
                      <div className="text-[10px] text-white/60 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-emerald-400" />
                        <span>Prix Vente (PPV) :</span>
                      </div>
                      <div className="font-bold text-sm text-emerald-400">
                        {apercuOcr.prix_vente} FCFA
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setApercuOcr(null)}
                  className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs font-semibold text-white/80 hover:bg-white/10"
                >
                  Reprendre
                </button>
                <button
                  type="button"
                  onClick={validerApercuOcr}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider & Remplir</span>
                </button>
              </div>
            </div>
          )}

          {/* Message d'erreur caméra si refusée ou indisponible */}
          {erreur && !scanReussiAnim && !apercuOcr && (
            <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center text-white z-20">
              <div className="p-3 rounded-full bg-danger/20 text-danger mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-xs sm:text-sm font-semibold max-w-xs">{erreur}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow"
              >
                <ImageIcon className="w-4 h-4" />
                Prendre une photo de la boîte
              </button>
            </div>
          )}
        </div>

        {/* BARRE D'ACTIONS & CONTRÔLES */}
        <div className="p-3.5 bg-surface border-t border-surface-border space-y-2.5">
          {/* Boutons de contrôle de la caméra */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Torche / Flash */}
              {torchSupporte && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${torchActive
                      ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                      : "bg-background border-surface-border text-foreground hover:bg-surface-border/50"
                    }`}
                  title="Allumer / Éteindre le flash"
                >
                  <Zap className={`w-4 h-4 ${torchActive ? "fill-black" : ""}`} />
                  <span className="hidden sm:inline">{torchActive ? "Flash Allumé" : "Flash"}</span>
                </button>
              )}

              {/* Basculer Caméra avant / arrière */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2.5 rounded-xl border border-surface-border bg-background hover:bg-surface-border/50 text-foreground text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Changer de caméra (arrière / selfie)"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Changer d'objectif</span>
              </button>
            </div>

            {/* Bouton Photo & OCR Boîte (Lecture Texte Lot, Exp, Prix) */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
                title="Prendre une photo du rabat / de la boîte pour extraire Code, Lot, Péremption et Prix"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Photo Boîte & OCR</span>
              </button>
            </div>
          </div>

          {/* Aide textuelle pharmacie */}
          <div className="flex items-center justify-between text-[11px] text-foreground-muted px-1">
            <span className="flex items-center gap-1">
              <ScanLine className="w-3.5 h-3.5 text-emerald-500" />
              GS1 DataMatrix, EAN-13 & Lecture OCR
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Détection temps réel
            </span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scannerLaser {
          0% {
            top: 5%;
            opacity: 0.3;
          }
          50% {
            top: 92%;
            opacity: 1;
          }
          100% {
            top: 5%;
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
