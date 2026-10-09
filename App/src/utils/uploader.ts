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
  const uploadUrl = `${API_URL}/api/v1/uploads`;
  const cleanName = fileName || `file_${Date.now()}.jpg`;
  const cleanType = mimeType || "image/jpeg";

  // On Web: standard fetch works fine
  if (Platform.OS === "web") {
    const formData = new FormData();
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append("file", blob, cleanName);

    const res = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error?.message || `Upload failed with status ${res.status}`);
    }
    return {
      id: json.data.id,
      url: json.data.url,
      filename: json.data.filename || cleanName,
      size: json.data.size,
    };
  }

  // On Native (Android / iOS):
  // Expo's patched `fetch` uses `convertFormDataAsync` which crashes with
  // "Unsupported FormDataPart implementation" on React Native's file parts { uri, name, type }.
  // Using native XMLHttpRequest completely bypasses Expo's fetch patch and sends
  // the file part directly to OkHttp on Android!
  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            id: json.data.id,
            url: json.data.url,
            filename: json.data.filename || cleanName,
            size: json.data.size,
          });
        } else {
          reject(new Error(json?.error?.message || `Upload failed with status ${xhr.status}`));
        }
      } catch (e: any) {
        reject(new Error(`Failed to parse response: ${xhr.responseText.slice(0, 100)}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during file upload"));
    };

    xhr.ontimeout = () => {
      reject(new Error("File upload timed out"));
    };

    const formData = new FormData();
    formData.append("file", {
      uri: uri,
      name: cleanName,
      type: cleanType,
    } as any);

    xhr.send(formData);
  });
}

// Backward compatibility alias
export const uploadToCloudinary = uploadFile;

/**
 * Pick image from device camera roll
 */
export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    // Request permission first (vital for Android 13+ / 14 photo selector and permissions)
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access gallery is required to choose photos.");
      return null;
    }

    // Modern expo-image-picker (Expo 52/57) supports mediaTypes: ['images']
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false, // avoids Android native crop intent failure/crashes
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0];
    }
  } catch (err: any) {
    console.error("[pickImage error]:", err);
    alert(err?.message || "Could not open image picker");
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
