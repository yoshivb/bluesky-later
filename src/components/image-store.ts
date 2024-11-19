interface ImageData {
  id?: number;
  name: string;
  type: string;
  lastModified: number;
  file: Blob;
  sourceUrl?: string; // Added for remote images
  sourceType: "local" | "remote"; // Track image source
}

interface StorageEstimate {
  quota: number;
  usage: number;
  remaining: number;
}

export class ImageStore {
  private readonly dbName: string;
  private readonly storeName: string;
  private readonly version: number;

  constructor() {
    this.dbName = "ImageDB";
    this.storeName = "images";
    this.version = 1;
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request: IDBOpenDBRequest = indexedDB.open(
        this.dbName,
        this.version
      );

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
      };
    });
  }

  // Save local file
  async saveImage(file: File): Promise<number> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const item: ImageData = {
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        file: file,
        sourceType: "local",
      };

      const request = store.add(item);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }

  // Save remote image
  async saveImageFromUrl(url: string): Promise<number> {
    try {
      // Fetch the image
      const response = await fetch(url, {
        mode: "cors", // Depending on your needs
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      // Get the image type from the response headers
      const contentType = response.headers.get("content-type") || "image/jpeg";

      // Convert response to blob
      const blob = await response.blob();

      // Generate a filename from the URL
      const fileName = this.getFileNameFromUrl(url);

      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);

        const item: ImageData = {
          name: fileName,
          type: contentType,
          lastModified: Date.now(),
          file: blob,
          sourceUrl: url,
          sourceType: "remote",
        };

        const request = store.add(item);

        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error as Error); // Cast error to Error type
        transaction.oncomplete = () => db.close();
      });
    } catch (error: unknown) {
      // Specify error type as unknown
      throw new Error(
        `Failed to save image from URL: ${(error as Error).message}`
      ); // Cast error to Error type
    }
  }

  // Utility function to get filename from URL
  private getFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split("/").pop();
      return fileName || `image-${Date.now()}`;
    } catch {
      return `image-${Date.now()}`;
    }
  }

  // Batch save multiple remote images
  async saveMultipleImagesFromUrls(urls: string[]): Promise<number[]> {
    const results: number[] = [];
    const errors: { url: string; error: string }[] = [];

    for (const url of urls) {
      try {
        const id = await this.saveImageFromUrl(url);
        results.push(id);
      } catch (error: unknown) {
        errors.push({ url, error: (error as Error).message });
      }
    }

    if (errors.length > 0) {
      console.error("Some images failed to save:", errors);
    }

    return results;
  }

  // Get all images
  async getAllImages(): Promise<ImageData[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }

  // Get single image
  async getImage(id: number): Promise<ImageData | undefined> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }

  // Delete image
  async deleteImage(id: number): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }

  // Validate remote URL
  async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: "HEAD" });
      const contentType = response.headers.get("content-type");
      return contentType ? contentType.startsWith("image/") : false;
    } catch {
      return false;
    }
  }

  // Validate file
  validateFile(file: File | Blob, maxSizeInMB: number = 5): void {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      throw new Error(`File size exceeds ${maxSizeInMB}MB limit`);
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "File type not supported. Please use JPEG, PNG, GIF, or WebP images."
      );
    }
  }

  // Check storage estimate
  async checkStorageEstimate(): Promise<StorageEstimate | null> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota || 0,
        usage: estimate.usage || 0,
        remaining: (estimate.quota || 0) - (estimate.usage || 0),
      };
    }
    return null;
  }

  async getImageAsBase64(id: number): Promise<string | null> {
    try {
      const imageData = await this.getImage(id);
      console.log(imageData);
      if (!imageData) {
        return null;
      }

      return await this.blobToBase64(imageData.file);
    } catch (error: unknown) {
      throw new Error(
        `Failed to convert image to base64: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get base64 representation with data URL prefix (e.g., "data:image/jpeg;base64,...")
   */
  async getImageAsDataUrl(id: number): Promise<string | null> {
    try {
      const imageData = await this.getImage(id);
      if (!imageData) {
        return null;
      }

      const base64 = await this.blobToBase64(imageData.file);
      return `data:${imageData.type};base64,${base64}`;
    } catch (error: unknown) {
      throw new Error(
        `Failed to convert image to data URL: ${(error as Error).message}`
      );
    }
  }

  /**
   * Convert a Blob/File to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          // Remove the data URL prefix if present
          const base64 = reader.result.includes("base64,")
            ? reader.result.split("base64,")[1]
            : reader.result;
          resolve(base64);
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Save an image from base64 string
   */
  async saveBase64Image(
    base64: string,
    fileName: string,
    mimeType: string = "image/jpeg"
  ): Promise<number> {
    try {
      // Remove data URL prefix if present
      const base64Data = base64.includes("base64,")
        ? base64.split("base64,")[1]
        : base64;

      // Convert base64 to Blob
      const byteCharacters = atob(base64Data);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        const byteNumbers = new Array(slice.length);

        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }

      const blob = new Blob(byteArrays, { type: mimeType });

      // Validate the blob
      this.validateFile(blob);

      // Save the image
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);

        const item: ImageData = {
          name: fileName,
          type: mimeType,
          lastModified: Date.now(),
          file: blob,
          sourceType: "local",
        };

        const request = store.add(item);

        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => db.close();
      });
    } catch (error: unknown) {
      throw new Error(
        `Failed to save base64 image: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get all images as base64 strings
   */
  async getAllImagesAsBase64(): Promise<
    Array<{ id: number; base64: string; type: string; name: string }>
  > {
    try {
      const images = await this.getAllImages();
      const result = await Promise.all(
        images.map(async (img) => ({
          id: img.id!,
          base64: await this.blobToBase64(img.file),
          type: img.type,
          name: img.name,
        }))
      );
      return result;
    } catch (error: unknown) {
      throw new Error(
        `Failed to get images as base64: ${(error as Error).message}`
      );
    }
  }
}
