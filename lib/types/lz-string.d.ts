declare namespace LZString {
  function compressToEncodedURIComponent(input: string): string;
  function decompressFromEncodedURIComponent(input: string): string | null;
}
