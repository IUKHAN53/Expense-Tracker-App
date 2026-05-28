import * as MediaLibrary from 'expo-media-library';

/**
 * Save an image (by local uri) to the device gallery so a receipt can be
 * re-imported later — handy when offline, since scanning needs the server.
 * Returns true on success. Throws only on unexpected errors; a denied
 * permission resolves to false so the caller can show a friendly message.
 */
export async function saveToGallery(uri) {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) return false;
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}
