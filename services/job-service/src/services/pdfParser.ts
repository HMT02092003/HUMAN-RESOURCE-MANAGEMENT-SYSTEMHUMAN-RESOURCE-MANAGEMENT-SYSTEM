import fs from 'fs/promises';

// Dynamically import pdf-parse and normalize default/commonjs exports.
async function loadPdfParse() {
  const mod = await import('pdf-parse');
  // module may export the function as default or as module.exports
  const modAny = mod as any;

  // 1) module itself is a function (CJS module.exports = fn)
  if (typeof modAny === 'function') return modAny as (data: Buffer) => Promise<any>;

  // 2) default export is the function (ESM interop)
  if (typeof modAny.default === 'function') return modAny.default as (data: Buffer) => Promise<any>;

  // 3) named export parse(...) or pdfParse(...)
  if (modAny && typeof modAny.parse === 'function') return modAny.parse.bind(modAny) as (data: Buffer) => Promise<any>;
  if (modAny && typeof modAny.pdfParse === 'function') return modAny.pdfParse.bind(modAny) as (data: Buffer) => Promise<any>;

  // 4) sometimes default is object with parse/pdfParse
  const def = modAny && (modAny.default ?? {});
  if (def && typeof def.parse === 'function') return def.parse.bind(def) as (data: Buffer) => Promise<any>;
  if (def && typeof def.pdfParse === 'function') return def.pdfParse.bind(def) as (data: Buffer) => Promise<any>;
  // 5) Newer versions export a PDFParse class
  const PDFParseClass = modAny.PDFParse ?? (modAny.default && modAny.default.PDFParse) ?? (modAny.default ?? null);
  if (PDFParseClass && typeof PDFParseClass === 'function') {
    // Return a function compatible with older api: (buffer) => ({ text })
    const wrapper = async (data: Buffer) => {
      // instantiate parser with options object { data }
      const parser = new (PDFParseClass as any)({ data });
      // Prefer getText() if available
      if (typeof parser.getText === 'function') {
        const res = await parser.getText();
        // res may be object with .text
        return res;
      }
      // Fallback: try parse method on instance
      if (typeof parser.parse === 'function') {
        return await parser.parse();
      }
      throw new TypeError('pdf-parse PDFParse class found but no getText/parse method available');
    };
    return wrapper as unknown as (data: Buffer) => Promise<any>;
  }

  throw new TypeError('pdf-parse module did not export a callable parse function (checked: module, default, parse, pdfParse, PDFParse class)');
}

export async function getTextFromPdf(filePathOrBuffer: string | Buffer): Promise<string> {
  const pdfParse = await loadPdfParse();
  if (typeof pdfParse !== 'function') {
    throw new TypeError('pdf-parse module did not export a callable parse function');
  }

  const data: Buffer = typeof filePathOrBuffer === 'string'
    ? await fs.readFile(filePathOrBuffer)
    : filePathOrBuffer;

  const parsed = await pdfParse(data as Buffer);
  return (parsed && parsed.text) ? String(parsed.text) : '';
}

export default getTextFromPdf;
