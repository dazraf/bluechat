declare class Html5Qrcode {
  constructor(elementId: string);
  start(
    cameraIdOrConfig: { facingMode: string } | string,
    config: { fps: number; qrbox: { width: number; height: number }; aspectRatio: number },
    onSuccess: (decodedText: string) => void,
    onFailure: (error: string) => void
  ): Promise<void>;
  stop(): Promise<void>;
  isScanning: boolean;
}
