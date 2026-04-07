
/**
 * Returns true for animated GIFs or other non-compressible image types.
 */
const isNonCompressibleImage = (file: File | Blob): boolean => {
  return file.type === "image/gif";
};

export const getFileExtension = (file: File | Blob): string => {
  if (file instanceof File && file.name) {
    const parts = file.name.split(".");
    if (parts.length > 1) {
      return parts.pop()!.toLowerCase();
    }
  }
  const mimeParts = file.type.split("/");
  const extension = mimeParts[1] ? mimeParts[1].split("+")[0] : "jpg";
  return extension.toLowerCase();
};

export const getContentType = (file: File | Blob): string => {
  return file.type || "application/octet-stream";
};

/**
 * Compresses an image file using the Canvas API.
 * GIFs are preserved without conversion so animation is not lost.
 * @param file The original image file
 * @param maxWidth The maximum width of the compressed image
 * @param maxHeight The maximum height of the compressed image
 * @param quality The quality of the compressed image (0.0 to 1.0)
 * @returns A promise that resolves to the compressed Blob
 */
export const compressImage = (
  file: File | Blob,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.7
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (isNonCompressibleImage(file)) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas toBlob failed"));
            }
          },
          getContentType(file) === "image/png" ? "image/png" : "image/jpeg",
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Converts a base64 string to a Blob object.
 */
export const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

/**
 * Uploads a file to Supabase Storage and returns the public URL.
...
 * @param supabase Supabase client
 * @param bucket Bucket name
 * @param path File path in bucket
 * @param file File or Blob to upload
 * @returns A promise that resolves to the public URL
 */
export const uploadToStorage = async (
  supabase: any,
  bucket: string,
  path: string,
  file: File | Blob
): Promise<string> => {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: getContentType(file)
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl;
};
