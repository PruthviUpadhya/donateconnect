import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../config/api";
import { Platform } from "react-native";

export interface UploadResult {
  id: string;
  url: string;
  filename?: string;
  size?: number;
}

/**
 * Uploads a file/image directly to the backend database storage (/api/v1/uploads)
 * and returns the streamable file URL (/api/v1/files/:id).
 * Zero Cloudinary dependency.
 */
export async function uploadFile(
  uri: string,
  fileName: string = "document",
  mimeType: string = "application/pdf"
): Promise<UploadResult> {
  const formData = new FormData();

  if (Platform.OS === "web") {
    // Web: fetch blob then append with filename
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append("file", blob, fileName);
  } else {
    // Native (iOS/Android): standard React Native FormData file object
    formData.append("file", {
      uri: uri,
      name: fileName || "document.pdf",
      type: mimeType || "application/pdf",
    } as any);
  }

  const res = await fetch(`${API_URL}/api/v1/uploads`, {
    method: "POST",
    headers: {
      // Do NOT set Content-Type header manually for multipart/form-data
    },
    body: formData,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Upload server responded with non-JSON: ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(json?.error?.message || `Upload failed with status ${res.status}`);
  }

  return {
    id: json.data.id,
    url: json.data.url,
    filename: json.data.filename || fileName,
    size: json.data.size,
  };
}

// Backward compatibility alias
export const uploadToCloudinary = uploadFile;

/**
 * Pick image from device camera roll
 */
export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0];
  }
  return null;
}

/**
 * Pick document (PDF, PNG, JPG) from device filesystem
 */
export async function pickDocument(): Promise<DocumentPicker.DocumentPickerAsset | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*"],
    copyToCacheDirectory: true,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0];
  }
  return null;
}
