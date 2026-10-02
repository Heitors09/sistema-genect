export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function readFiles(files: FileList | File[] | null) {
  if (!files) return [];
  return Promise.all([...files].map(readAsDataUrl));
}
