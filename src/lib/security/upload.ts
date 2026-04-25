const maxSlipBytes = 8 * 1024 * 1024;

export function validateSlipFileMetadata(file: File) {
  if (file.size <= 0) {
    return "file is empty";
  }

  if (file.size > maxSlipBytes) {
    return "file must be 8MB or smaller";
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "only JPG, PNG, or WEBP files are supported";
  }

  return null;
}

export async function validateSlipFileSignature(file: File) {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (file.type === "image/jpeg" && isJpeg(header)) {
    return null;
  }

  if (file.type === "image/png" && isPng(header)) {
    return null;
  }

  if (file.type === "image/webp" && isWebp(header)) {
    return null;
  }

  return "file content does not match its declared image type";
}

function isJpeg(header: Uint8Array) {
  return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
}

function isPng(header: Uint8Array) {
  return (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  );
}

function isWebp(header: Uint8Array) {
  return (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  );
}
