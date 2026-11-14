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
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface ScannerCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeDetecte: (code: string) => void;
  titre?: string;
  sousTitre?: string;
}

export default function ScannerCameraModal({
  isOpen,
  onClose,
  onCodeDetecte,
  titre = "Scanner un Médicament (Caméra)",
  sousTitre = "Pointez la caméra vers le Code QR, DataMatrix GS1 ou Code-barres",
}: ScannerCameraModalProps) {
  const containerId = "d-pharma-qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isStarting, setIsStarting] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchSupporte, setTorchSupporte] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [dernierCodeScanne, setDernierCodeScanne] = useState<string | null>(null);
  const [scanReussiAnim, setScanReussiAnim] = useState(false);

  // Émission d'un bip sonore de confirmation
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
      // Ignorer si audio non autorisé
    }
  }, []);

  // Déclencher le succès lors de la lecture d'un code
  const traiterCodeDetecte = useCallback(
    (codeBrut: string) => {
      const code = codeBrut.trim();
      if (!code || code === dernierCodeScanne) return;

      setDernierCodeScanne(code);
      setScanReussiAnim(true);
      biperScan();

      setTimeout(() => {
        onCodeDetecte(code);
        setScanReussiAnim(false);
        onClose();
      }, 350);

      setTimeout(() => {
        setDernierCodeScanne(null);
      }, 1500);
    },
    [dernierCodeScanne, biperScan, onCodeDetecte, onClose]
  );

  // Démarrage du scanner Html5Qrcode
  useEffect(() => {
    if (!isOpen) return;

    let estMonte = true;
    setIsStarting(true);
    setErreur(null);

    const formatsToSupport = [
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.DATA_MATRIX,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
    ];

    const demarrerScanner = async () => {
      try {
        // Attendre que le conteneur DOM soit monté
        await new Promise((resolve) => setTimeout(resolve, 80));
        if (!estMonte) return;

        const conteneur = document.getElementById(containerId);
        if (!conteneur) return;

        // Arrêter toute instance précédente
        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop();
            }
            scannerRef.current.clear();
          } catch {}
          scannerRef.current = null;
        }

        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport,
          verbose: false,
        });
        scannerRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const w = Math.max(220, Math.floor(minEdge * 0.78));
            const h = Math.max(160, Math.floor(minEdge * 0.55));
            return { width: w, height: h };
          },
          aspectRatio: 1.333333,
        };

        await scanner.start(
          { facingMode },
          config,
          (decodedText) => {
            if (estMonte) {
              traiterCodeDetecte(decodedText);
            }
          },
          () => {
            // Frame ignorée sans code
          }
        );

        if (estMonte) {
          setCameraActive(true);
          setIsStarting(false);

          // Vérifier si la torche est supportée
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
          msg = `Accès caméra restreint (${err?.message || err}). Utilisez le bouton ci-dessous pour capturer une photo.`;
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
            }).catch(() => {});
          } else {
            scannerRef.current.clear();
            scannerRef.current = null;
          }
        } catch {}
      }
      setCameraActive(false);
      setTorchActive(false);
    };
  }, [isOpen, facingMode, traiterCodeDetecte]);

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

  // Gestion du scan alternatif via fichier / photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErreur(null);
    try {
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        traiterCodeDetecte(decodedText);
      } else {
        setErreur("Aucun code QR ni code-barres net détecté sur cette photo.");
      }
    } catch (err: any) {
      console.warn("Erreur scanFile:", err);
      setErreur("Aucun code-barres ni code QR détecté sur l'image. Rapprochez la boîte et assurez un bon éclairage.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-lg bg-surface border border-surface-border rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
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
            className="p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
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
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 text-white text-xs z-10">
              <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Démarrage du flux caméra en direct...</span>
            </div>
          )}

          {/* VISEUR INTERACTIF & ANIMATION LASER */}
          {cameraActive && !isStarting && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 z-10">
              <div
                className={`relative w-64 h-48 sm:w-72 sm:h-52 rounded-2xl border-2 transition-all duration-300 ${
                  scanReussiAnim
                    ? "border-emerald-400 bg-emerald-400/20 scale-105 shadow-2xl shadow-emerald-500/50"
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white bg-emerald-600/40 backdrop-blur-xs rounded-2xl">
                    <CheckCircle2 className="w-12 h-12 text-emerald-300 animate-bounce" />
                    <span className="font-bold text-sm bg-black/60 px-3 py-1 rounded-full">
                      Code détecté !
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message d'erreur caméra si refusée ou indisponible */}
          {erreur && !scanReussiAnim && (
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
        <div className="p-4 bg-surface border-t border-surface-border space-y-3">
          {/* Boutons de contrôle de la caméra */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Torche / Flash */}
              {torchSupporte && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                    torchActive
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
                className="p-2.5 rounded-xl border border-surface-border bg-background hover:bg-surface-border/50 text-foreground text-xs font-bold flex items-center gap-1.5 transition"
                title="Changer de caméra (arrière / selfie)"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Changer d'objectif</span>
              </button>
            </div>

            {/* Déclencheur photo alternatif */}
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
                className="px-3 py-2.5 rounded-xl border border-surface-border bg-background hover:bg-surface-border/50 text-foreground text-xs font-bold flex items-center gap-1.5 transition"
                title="Prendre une photo avec l'appareil photo du téléphone"
              >
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                <span>Prendre photo</span>
              </button>
            </div>
          </div>

          {/* Aide textuelle pharmacie */}
          <div className="flex items-center justify-between text-[11px] text-foreground-muted px-1">
            <span className="flex items-center gap-1">
              <ScanLine className="w-3.5 h-3.5 text-emerald-500" />
              Codes acceptés : QR, DataMatrix GS1, EAN-13
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
