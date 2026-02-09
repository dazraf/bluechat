declare function qrcode(typeNumber: number, errorCorrectionLevel: string): QRCode;

interface QRCode {
  addData(data: string): void;
  make(): void;
  createDataURL(cellSize?: number, margin?: number): string;
}
