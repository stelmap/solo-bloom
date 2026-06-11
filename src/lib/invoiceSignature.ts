import { supabase } from "@/integrations/supabase/client";

export const SIGNATURE_BUCKET = "invoice-signatures";

export interface SignatureAsset {
  dataUrl: string;
  /** image natural width / height in px (used to preserve aspect ratio) */
  width: number;
  height: number;
  format: "PNG" | "JPEG" | "WEBP";
}

function detectFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

function loadImageDims(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

export async function fileToSignatureAsset(file: File): Promise<SignatureAsset> {
  const dataUrl = await blobToDataUrl(file);
  const { width, height } = await loadImageDims(dataUrl);
  return { dataUrl, width, height, format: detectFormat(dataUrl) };
}

export async function loadSignatureAssetFromPath(path: string): Promise<SignatureAsset | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(SIGNATURE_BUCKET).download(path);
  if (error || !data) return null;
  const dataUrl = await blobToDataUrl(data);
  try {
    const { width, height } = await loadImageDims(dataUrl);
    return { dataUrl, width, height, format: detectFormat(dataUrl) };
  } catch {
    return null;
  }
}
