export async function downloadWithAuth(api, url, filename) {
  const res = await api.get(url, { responseType: "blob" });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const objUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename || "archivo.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(objUrl);
}