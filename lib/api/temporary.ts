export interface TemporaryUploadResponse {
  url: string;
}

export async function uploadTemporaryFile(file: File, emosId: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("emos_id", emosId);

  const response = await fetch("https://temporary.emos.best/upload", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `临时文件上传失败：${response.status}`);
  }

  const result = (await response.json()) as TemporaryUploadResponse;

  if (!result.url) {
    throw new Error("临时文件上传失败：响应缺少 URL");
  }

  return result;
}
