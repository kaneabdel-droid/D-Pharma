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

interface ScannerCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeDetecte: (code: string) => void;
  titre?: string;
  sousTitre?: string;
}

// Déclaration TypeScript pour l'API native BarcodeDetector
declare global {
  interface Window {
    BarcodeDetector?: {
      new(options?: { formats: string[] }): {
        detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<
          Array<{ rawValue: string; format: string }>
        >;
      };
      getSupportedFormats(): Promise<string[]>;
    };
  }
}

export default function ScannerCameraModal({
  isOpen,
  onClose,
  onCodeDetecte,
  titre = "Scanner un Médicament (Caméra)",
  sousTitre = "Pointez la caméra de votre smartphone ou tablette vers le Code QR, DataMatrix ou Code-barres",
}: ScannerCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchSupporte, setTorchSupporte] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [dernierCodeScanne, setDernierCodeScanne] = useState<string | null>(null);
  const [scanReussiAnim, setScanReussiAnim] = useState(false);
  const [barcodeDetectorDispo, setBarcodeDetectorDispo] = useState(false);

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
      }, 400);

      // Réinitialiser après 1.5s pour permettre un nouveau scan du même code si nécessaire
      setTimeout(() => {
        setDernierCodeScanne(null);
      }, 1500);
    },
    [dernierCodeScanne, biperScan, onCodeDetecte]
  );

  // Démarrer le flux vidéo de la caméra
  const demarrerCamera = useCallback(async () => {
    setErreur(null);
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErreur("Votre navigateur ne supporte pas l'accès direct à la caméra. Utilisez le bouton photo ci-dessous.");
        return;
      }

      const contraintes: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const nouveauStream = await navigator.mediaDevices.getUserMedia(contraintes);
      setStream(nouveauStream);

      if (videoRef.current) {
        videoRef.current.srcObject = nouveauStream;
        await videoRef.current.play();
        setCameraActive(true);
      }

      // Vérifier si la torche / flash est supportée
      const track = nouveauStream.getVideoTracks()[0];
      const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setTorchSupporte(true);
      } else {
        setTorchSupporte(false);
      }
    } catch (err: any) {
      console.warn("Erreur caméra:", err);
      let msg = "Impossible d'accéder à la caméra.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Permission caméra refusée. Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "Aucune caméra détectée sur cet appareil.";
      }
      setErreur(msg);
      setCameraActive(false);
    }
  }, [facingMode, stream]);

  // Basculer la torche (flash)
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const nextTorch = !torchActive;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchActive(nextTorch);
    } catch (e) {
      console.warn("Erreur activation torche:", e);
    }
  };

  // Basculer caméra avant / arrière
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Boucle de détection via BarcodeDetector natif
  useEffect(() => {
    if (!isOpen) return;

    let actif = true;
    let animationFrameId: number;

    const formats = [
      "qr_code",
      "data_matrix",
      "ean_13",
      "ean_8",
      "code_128",
      "code_39",
      "upc_a",
      "upc_e",
    ];

    const hasNative = typeof window !== "undefined" && "BarcodeDetector" in window;
    setBarcodeDetectorDispo(hasNative);

    let detector: any = null;
    if (hasNative && window.BarcodeDetector) {
      try {
        detector = new window.BarcodeDetector({ formats });
      } catch (e) {
        console.warn("BarcodeDetector formats non supportés, fallback tous formats", e);
        try {
          detector = new window.BarcodeDetector();
        } catch {
          detector = null;
        }
      }
    }

    const scannerBoucle = async () => {
      if (!actif) return;

      if (videoRef.current && videoRef.current.readyState >= 2 && detector) {
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            traiterCodeDetecte(codes[0].rawValue);
          }
        } catch {
          // Détection en cours
        }
      }

      animationFrameId = requestAnimationFrame(scannerBoucle);
    };

    demarrerCamera().then(() => {
      if (actif) {
        animationFrameId = requestAnimationFrame(scannerBoucle);
      }
    });

    return () => {
      actif = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, demarrerCamera, traiterCodeDetecte]);

  // Arrêter le flux à la fermeture
  useEffect(() => {
    if (!isOpen && stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
      setCameraActive(false);
      setTorchActive(false);
    }
  }, [isOpen, stream]);

  // Gestion du scan alternatif via fichier / photo prise directement par le téléphone
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.BarcodeDetector) {
      try {
        const imageBitmap = await createImageBitmap(file);
        const detector = new window.BarcodeDetector();
        const codes = await detector.detect(imageBitmap);
        if (codes && codes.length > 0 && codes[0].rawValue) {
          traiterCodeDetecte(codes[0].rawValue);
          return;
        } else {
          setErreur("Aucun code QR ni code-barres net détecté sur cette photo. Rapprochez la boîte et réessayez.");
        }
      } catch (err) {
        setErreur("Erreur lors de l'analyse de l'image.");
      }
    } else {
      setErreur("Analyse photo non supportée sans BarcodeDetector sur ce navigateur.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-lg bg-surface border border-surface-border rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
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

        {/* ZONE DE VISUALISATION VIDÉO / CADRE DE VISÉE */}
        <div className="relative w-full bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? "opacity-100" : "opacity-0"
              }`}
          />

          {/* Canvas caché pour l'analyse d'images */}
          <canvas ref={canvasRef} className="hidden" />

          {/* VISEUR INTERACTIF PHARMACEUTIQUE */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div
              className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl border-2 transition-all duration-300 ${scanReussiAnim
                  ? "border-emerald-400 bg-emerald-400/20 scale-105 shadow-2xl shadow-emerald-500/50"
                  : "border-white/60 bg-transparent"
                }`}
            >
              {/* Coins de visée */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg -mt-1 -ml-1" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg -mt-1 -mr-1" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg -mb-1 -ml-1" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg -mb-1 -mr-1" />

              {/* Ligne laser animée */}
              {!scanReussiAnim && cameraActive && (
                <div className="absolute left-2 right-2 h-0.5 bg-linear-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-500/80 animate-[bounce_2s_infinite]" />
              )}

              {/* Statut visuel au scan réussi */}
              {scanReussiAnim && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-400 font-bold gap-2">
                  <CheckCircle2 className="w-12 h-12 animate-bounce" />
                  <span className="text-sm bg-black/60 px-3 py-1 rounded-full text-white">
                    Code détecté !
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* COMMANDES RAPIDES SUR LE FLUX VIDÉO */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {torchSupporte && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2.5 rounded-full backdrop-blur-md transition ${torchActive ? "bg-amber-500 text-white shadow-lg" : "bg-black/40 text-white hover:bg-black/60"
                  }`}
                title="Activer la lampe torche"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition"
              title="Changer de caméra (Avant / Arrière)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* MESSAGE CHARGEMENT / ERREUR */}
          {!cameraActive && !erreur && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-xs gap-3 p-4 text-center">
              <ScanLine className="w-8 h-8 animate-pulse text-emerald-400" />
              <p>Activation de la caméra du smartphone...</p>
            </div>
          )}
        </div>

        {/* PIED DE MODALE & OPTIONS ALTERNATIVES */}
        <div className="p-4 bg-surface space-y-3">
          {erreur && (
            <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {/* DÉTECTION NATIVE DISPONIBLE OU PAS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-foreground-muted">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Supporte : QR Code, DataMatrix pharma (GS1), EAN-13, EAN-8</span>
            </div>

            {/* BOUTON ALTERNATIF PHOTO / FICHIER */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl border border-surface-border text-foreground hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Prendre une photo</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-surface-border text-xs font-semibold text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              Fermer le scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

