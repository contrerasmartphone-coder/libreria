import React, { useState, useRef } from 'react';
import { FileUp, X, CheckCircle2, AlertCircle, FileJson, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { libraryService } from '../services/libraryService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleParseFile(selectedFile);
  };

  const handleParseFile = async (file: File) => {
    setFile(file);
    setError(null);
    setLoading(true);

    try {
      let rawData: any[] = [];
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        rawData = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });
      }

      // Normalizzazione e Filtro
      const normalized = rawData
        .filter(row => row && (row.titolo || row.Titolo || Object.values(row).some(v => v !== null && v !== "")))
        .map(row => {
          const entry: any = {};
          
          // Map of Italian/Common headers to Book interface keys
          const keyMap: { [key: string]: string } = {
            'titolo': 'titolo', 'title': 'titolo', 'nome': 'titolo',
            'autore': 'autore', 'author': 'autore',
            'codice': 'codice', 'isbn': 'codice', 'code': 'codice',
            'genere': 'genere', 'genre': 'genere',
            'editore': 'editore', 'publisher': 'editore',
            'edizione': 'edizione', 'edition': 'edizione',
            'collana': 'collana', 'series': 'collana',
            'formato': 'formato', 'format': 'formato',
            'pagine': 'pagine', 'pages': 'pagine',
            'anno': 'anno', 'year': 'anno',
            'nazione': 'nazione', 'country': 'nazione',
            'scaffale': 'scaffale', 'shelf': 'scaffale',
            'riassunto': 'riassunto', 'summary': 'riassunto', 'descrizione': 'riassunto',
            'commento': 'commento', 'comment': 'commento', 'note': 'commento',
            'traduttore': 'traduttore', 'translator': 'traduttore',
            'titolo originale': 'titoloOriginale', 'original title': 'titoloOriginale',
            'titolooriginale': 'titoloOriginale',
            'prestito a': 'prestitoA', 'prestito_a': 'prestitoA', 'prestitoa': 'prestitoA', 'borrowed to': 'prestitoA',
            'prestito dal': 'prestitoDal', 'prestitodal': 'prestitoDal', 'prestito_dal': 'prestitoDal',
            'proprieta dal': 'proprietaDal', 'proprietadal': 'proprietaDal', 'proprieta_dal': 'proprietaDal',
            'proprieta di': 'proprietaDi', 'proprieta_di': 'proprietaDi', 'proprietadi': 'proprietaDi', 'owned by': 'proprietaDi'
          };

          Object.entries(row).forEach(([key, val]) => {
            const k = key.toLowerCase().replace(/_/g, ' ').trim();
            const mappedKey = keyMap[k] || keyMap[k.replace(/\s/g, '')];
            
            if (mappedKey) {
              entry[mappedKey] = val;
            } else if (k === 'inprestito' || k === 'in prestito' || k === 'prestito' || k === 'lending') {
              const s = String(val).toUpperCase().trim();
              entry.inPrestito = (s === 'S' || s === 'SI' || s === 'Y' || s === 'YES' || s === 'TRUE' || s === '1' || val === true || val === 1);
            } else if (k === 'diproprieta' || k === 'proprieta' || k === 'di proprieta' || k === 'owned' || k === 'diproprietà') {
              const s = String(val).toUpperCase().trim();
              entry.diProprieta = (s === 'S' || s === 'SI' || s === 'Y' || s === 'YES' || s === 'TRUE' || s === '1' || val === true || val === 1);
            } else if (k === 'romanzo' || k === 'isromanzo' || k === 'is romanzo') {
               const s = String(val).toUpperCase().trim();
               entry.isRomanzo = (s === 'S' || s === 'SI' || s === 'Y' || s === 'YES' || s === 'TRUE' || s === '1' || val === true || val === 1);
            } else if (k === 'lingua originale' || k === 'linguaoriginale' || k === 'islinguaoriginale' || k === 'in lingua originale') {
               const s = String(val).toUpperCase().trim();
               entry.isLinguaOriginale = (s === 'S' || s === 'SI' || s === 'Y' || s === 'YES' || s === 'TRUE' || s === '1' || val === true || val === 1);
            }
          });

          // Boolean defaults if not found
          if (entry.inPrestito === undefined) entry.inPrestito = false;
          if (entry.diProprieta === undefined) entry.diProprieta = true;
          if (entry.isRomanzo === undefined) entry.isRomanzo = false;
          if (entry.isLinguaOriginale === undefined) entry.isLinguaOriginale = false;

          // Fallback parsing for numbers
          if (entry.pagine === undefined || entry.pagine === null || isNaN(Number(entry.pagine))) entry.pagine = 0;
          else entry.pagine = Number(entry.pagine);
          
          if (entry.anno === undefined || entry.anno === null || isNaN(Number(entry.anno))) entry.anno = 0;
          else entry.anno = Number(entry.anno);

          // Defaults for all 24 fields
          const finalBook: any = {
            anno: entry.anno,
            autore: String(entry.autore || ""),
            codice: String(entry.codice || ""),
            collana: String(entry.collana || ""),
            commento: String(entry.commento || ""),
            diProprieta: !!entry.diProprieta,
            editore: String(entry.editore || ""),
            edizione: String(entry.edizione || ""),
            formato: String(entry.formato || ""),
            genere: String(entry.genere || ""),
            inPrestito: !!entry.inPrestito,
            isLinguaOriginale: !!entry.isLinguaOriginale,
            isRomanzo: !!entry.isRomanzo,
            nazione: String(entry.nazione || ""),
            pagine: entry.pagine,
            prestitoA: entry.prestitoA ? String(entry.prestitoA) : "",
            prestitoDal: entry.prestitoDal ? String(entry.prestitoDal) : "",
            proprietaDal: entry.proprietaDal ? String(entry.proprietaDal) : "",
            proprietaDi: entry.proprietaDi ? String(entry.proprietaDi) : "",
            riassunto: String(entry.riassunto || ""),
            scaffale: String(entry.scaffale || ""),
            titolo: entry.titolo || "Senza Titolo",
            titoloOriginale: String(entry.titoloOriginale || ""),
            traduttore: String(entry.traduttore || "")
          };
          
          return finalBook;
        });

      setData(normalized);
    } catch (err: any) {
      setError(err.message || "Errore durante la lettura del file.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (data.length === 0) return;
    setLoading(true);
    console.log(`Starting import of ${data.length} books...`);
    try {
      await libraryService.batchImportBooks(data);
      console.log("Import completed successfully.");
      onSuccess();
    } catch (err: any) {
      console.error("Import failed:", err);
      setError(err.message || "Errore durante l'importazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-editorial-text/40 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-editorial-bg shadow-[0_0_100px_rgba(0,0,0,0.3)] flex flex-col max-h-[80vh] border border-editorial-text/10"
      >
        <div className="p-8 border-b border-editorial-text/5 flex items-end justify-between">
          <div>
            <h2 className="text-4xl font-bold tracking-tight italic">Importa Database</h2>
            <p className="font-sans text-[10px] opacity-70 uppercase tracking-[0.1em] font-bold mt-1">Caricamento massivo volumi (JSON, Excel, CSV)</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-neutral-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) handleParseFile(droppedFile);
              }}
              className="border-2 border-dashed border-editorial-text/10 aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-editorial-text/30 transition-colors group bg-white/50"
            >
              <FileUp size={64} className="opacity-20 group-hover:opacity-40 transition-opacity mb-6" />
              <div className="text-center">
                <p className="text-xl font-bold italic tracking-tight mb-2">Trascina il file qui o clicca per sfogliare</p>
                <p className="font-sans text-xs opacity-50 uppercase tracking-widest">Supporta JSON, Excel (.xlsx) e CSV</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json,.xlsx,.xls,.csv"
              />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-6 p-6 bg-white border border-editorial-text/5">
                <div className="w-16 h-16 bg-editorial-text/5 flex items-center justify-center">
                  {file.name.endsWith('.json') ? <FileJson size={32} /> : <FileSpreadsheet size={32} />}
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold tracking-tight">{file.name}</div>
                  <div className="font-sans text-xs opacity-60 uppercase tracking-widest italic">{data.length} volumi rilevati</div>
                </div>
                <button 
                  onClick={() => { setFile(null); setData([]); }}
                  className="p-2 hover:bg-red-50 text-red-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-4 p-6 bg-red-50 border border-red-200 text-red-900">
                  <AlertCircle size={20} />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              {data.length > 0 && (
                <div className="border border-editorial-text/10">
                  <div className="bg-editorial-text/5 p-4 border-b border-editorial-text/10 font-sans text-xs font-black uppercase tracking-widest">
                    Anteprima Dati (Prime 5 voci)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white border-b border-editorial-text/5">
                        <tr>
                          {Object.keys(data[0]).slice(0, 6).map(key => (
                            <th key={key} className="p-4 font-bold italic opacity-60">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-editorial-text/5 hover:bg-neutral-50 transition-colors">
                            {Object.values(row).slice(0, 6).map((val: any, j) => (
                              <td key={j} className="p-4">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-10 border-t border-editorial-text/5 flex justify-end gap-6 bg-white/50">
          <button 
            onClick={onClose}
            className="px-8 py-4 font-sans text-xs font-black uppercase tracking-widest hover:underline"
          >
            Annulla
          </button>
          <button 
            onClick={handleImport}
            disabled={loading || data.length === 0}
            className={cn(
              "bg-editorial-text text-editorial-bg px-12 py-4 font-sans text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3",
              (loading || data.length === 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-editorial-bg/30 border-t-editorial-bg animate-spin rounded-full" />
            ) : <CheckCircle2 size={16} />}
            IMPORTA ORA
          </button>
        </div>
      </motion.div>
    </div>
  );
}
