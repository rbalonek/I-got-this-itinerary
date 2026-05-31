import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

const BUCKET = 'item-images';

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
};

// True for inline base64 images (data:image/...;base64,xxxx) — the heavy form
// we want to move out of the database and into Storage.
export const isDataUrl = (value) =>
  typeof value === 'string' && value.startsWith('data:');

const dataUrlToBlob = (dataUrl) => {
  const [meta, b64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || 'image/jpeg';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

/**
 * Uploads a base64 data-URL image to Storage under the user's folder and
 * returns its public URL. Throws on failure so callers can fall back to
 * keeping the inline image.
 */
export const uploadDataUrlImage = async (dataUrl, userId) => {
  const blob = dataUrlToBlob(dataUrl);
  const ext = MIME_EXT[blob.type] || 'jpg';
  const path = `${userId}/${uuidv4()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};
