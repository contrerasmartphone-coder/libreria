import React, { useState, useEffect } from "react";
import { Book } from "../types";
import { libraryService } from "../services/libraryService";
import { Save, Loader2, BookOpen, Info, User, Tag, Calendar, MapPin, Layers, BookText, ShieldCheck, Languages, X, Trash2, Plus, Edit2, Check, Printer } from "lucide-react";
import { cn } from "../lib/utils";

interface BookFormProps {
  initialData?: Book;
  onClose: () => void;
  onSuccess: () => void;
  onError?: (message: string) => void;
  onDelete?: (id: string | undefined) => Promise<void>;
  suggestions?: {
    autores: string[];
    generes: string[];
    editores: string[];
    collanas: string[];
    naziones: string[];
  };
}

export default function BookForm({ initialData, onClose, onSuccess, onError, onDelete, suggestions }: BookFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const [newRaccontoTitolo, setNewRaccontoTitolo] = useState("");
  const [newRaccontoAutore, setNewRaccontoAutore] = useState("");
  const [editingRaccontoId, setEditingRaccontoId] = useState<string | null>(null);
  const [editingRaccontoAutore, setEditingRaccontoAutore] = useState("");
  const [editingRaccontoTitolo, setEditingRaccontoTitolo] = useState("");
  const [dynamicSuggestions, setDynamicSuggestions] = useState<{
    autore: string[];
    genere: string[];
    editore: string[];
    collana: string[];
    nazione: string[];
    raccontoAutore: string[];
    editingRaccontoAutore: string[];
  }>({
    autore: [],
    genere: [],
    editore: [],
    collana: [],
    nazione: [],
    raccontoAutore: [],
    editingRaccontoAutore: [],
  });
  const [formData, setFormData] = useState<Omit<Book, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>(
    initialData ? {
      codice: initialData.codice || "",
      titolo: initialData.titolo || "",
      autore: initialData.autore || "",
      genere: initialData.genere || "",
      editore: initialData.editore || "",
      edizione: initialData.edizione || "",
      collana: initialData.collana || "",
      formato: initialData.formato || "",
      pagine: initialData.pagine || 0,
      anno: initialData.anno || new Date().getFullYear(),
      nazione: initialData.nazione || "",
      scaffale: initialData.scaffale || "",
      riassunto: initialData.riassunto || "",
      commento: initialData.commento || "",
      isRomanzo: !!initialData.isRomanzo,
      isLinguaOriginale: !!initialData.isLinguaOriginale,
      traduttore: initialData.traduttore || "",
      titoloOriginale: initialData.titoloOriginale || "",
      inPrestito: !!initialData.inPrestito,
      prestitoDal: initialData.prestitoDal || "",
      prestitoA: initialData.prestitoA || "",
      diProprieta: !!initialData.diProprieta,
      proprietaDal: initialData.proprietaDal || "",
      proprietaDi: initialData.proprietaDi || "",
      racconti: initialData.racconti || [],
    } : {
      codice: "",
      titolo: "",
      autore: "",
      genere: "",
      editore: "",
      edizione: "",
      collana: "",
      formato: "",
      pagine: 0,
      anno: new Date().getFullYear(),
      nazione: "",
      scaffale: "",
      riassunto: "",
      commento: "",
      isRomanzo: false,
      isLinguaOriginale: false,
      traduttore: "",
      titoloOriginale: "",
      inPrestito: false,
      prestitoDal: "",
      prestitoA: "",
      diProprieta: true,
      proprietaDal: new Date().toISOString().split('T')[0],
      proprietaDi: "",
      racconti: [],
    }
  );

  const handleAddRacconto = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newRaccontoTitolo.trim()) return;

    const newR = {
      id: crypto.randomUUID(),
      titolo: newRaccontoTitolo.trim(),
      autore: newRaccontoAutore.trim() || formData.autore || ""
    };

    setFormData(prev => ({
      ...prev,
      racconti: [...(prev.racconti || []), newR]
    }));

    setNewRaccontoTitolo("");
    setNewRaccontoAutore("");
  };

  const handleRemoveRacconto = (id: string) => {
    setFormData(prev => ({
      ...prev,
      racconti: (prev.racconti || []).filter(r => r.id !== id)
    }));
  };

  const handleUseBookAuthor = (e: React.MouseEvent) => {
    e.preventDefault();
    setNewRaccontoAutore(formData.autore || "");
  };

  const handleStartEditRacconto = (racconto: { id: string; titolo: string; autore?: string }) => {
    setEditingRaccontoId(racconto.id);
    setEditingRaccontoAutore(racconto.autore || "");
    setEditingRaccontoTitolo(racconto.titolo);
  };

  const handleCancelEditRacconto = () => {
    setEditingRaccontoId(null);
    setEditingRaccontoAutore("");
    setEditingRaccontoTitolo("");
  };

  const handleSaveRacconto = (id: string) => {
    if (!editingRaccontoTitolo.trim()) return;
    setFormData(prev => ({
      ...prev,
      racconti: (prev.racconti || []).map(r => 
        r.id === id 
          ? { ...r, titolo: editingRaccontoTitolo.trim(), autore: editingRaccontoAutore.trim() }
          : r
      )
    }));
    setEditingRaccontoId(null);
    setEditingRaccontoAutore("");
    setEditingRaccontoTitolo("");
  };

  // Debounce suggestions fetch for the form fields
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!activeSuggestion) return;

      const fieldKey = activeSuggestion as keyof typeof dynamicSuggestions;
      let dbField = activeSuggestion;
      let queryValue = "";

      if (activeSuggestion === "autore") {
        dbField = "autore";
        queryValue = formData.autore;
      } else if (activeSuggestion === "genere") {
        dbField = "genere";
        queryValue = formData.genere;
      } else if (activeSuggestion === "editore") {
        dbField = "editore";
        queryValue = formData.editore;
      } else if (activeSuggestion === "collana") {
        dbField = "collana";
        queryValue = formData.collana;
      } else if (activeSuggestion === "nazione") {
        dbField = "nazione";
        queryValue = formData.nazione;
      } else if (activeSuggestion === "raccontoAutore") {
        dbField = "autore";
        queryValue = newRaccontoAutore;
      } else if (activeSuggestion === "editingRaccontoAutore") {
        dbField = "autore";
        queryValue = editingRaccontoAutore;
      }

      if (queryValue.length >= 3) {
        try {
          const fetched = await libraryService.searchFieldSuggestions(dbField, queryValue);
          setDynamicSuggestions(prev => ({
            ...prev,
            [fieldKey]: fetched
          }));
        } catch (e) {
          console.error(`Error fetching suggestions for ${activeSuggestion}:`, e);
        }
      } else {
        setDynamicSuggestions(prev => ({
          ...prev,
          [fieldKey]: []
        }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    activeSuggestion,
    formData.autore,
    formData.genere,
    formData.editore,
    formData.collana,
    formData.nazione,
    newRaccontoAutore,
    editingRaccontoAutore
  ]);

// Pre-fill codice for new entries
  useEffect(() => {
    if (!initialData) {
      const fetchNextCode = async () => {
        try {
          const nextCode = await libraryService.getNextAvailableCode();
          setFormData(prev => ({ ...prev, codice: nextCode }));
        } catch (e) {
          console.error("Error fetching next code:", e);
        }
      };
      fetchNextCode();
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData?.id) {
        await libraryService.updateBook(initialData.id, formData);
      } else {
        await libraryService.addBook(formData);
      }
      onSuccess();
    } catch (error: any) {
      console.error("Save error:", error);
      if (onError) {
        onError(error.message || "Errore sconosciuto durante il salvataggio");
      } else {
        alert("Errore durante il salvataggio: " + (error.message || "Errore sconosciuto"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseInt(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleCheckbox = (name: keyof typeof formData) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleDelete = async () => {
    if (!initialData?.id || !onDelete) return;
    await onDelete(initialData.id);
    onClose();
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Biblioteca - Scheda Volume - ${formData.codice || ''}</title>
          <style>
            @page {
              size: portrait;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #1a1a1a;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.5;
              background-color: #ffffff;
            }
            .header {
              border-bottom: 2px solid #1a1a1a;
              padding-bottom: 12px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .header-title-container {
              display: flex;
              flex-direction: column;
            }
            .header .title {
              font-size: 18px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin: 0;
            }
            .header .subtitle {
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              color: #666;
              font-weight: 700;
              margin-top: 2px;
            }
            .header .codice {
              font-family: monospace;
              font-size: 13px;
              font-weight: bold;
              background-color: #f3f4f6;
              padding: 4px 8px;
              border: 1px solid #e5e7eb;
              border-radius: 2px;
            }
            
            .book-title {
              font-family: Georgia, serif;
              font-size: 22px;
              font-weight: bold;
              color: #111;
              margin: 0 0 4px 0;
              line-height: 1.2;
            }
            .book-author {
              font-size: 14px;
              font-weight: 600;
              color: #4b5563;
              margin-bottom: 20px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            .section-title {
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              font-weight: 800;
              color: #374151;
              border-bottom: 1.5px solid #e5e7eb;
              padding-bottom: 4px;
              margin-top: 20px;
              margin-bottom: 10px;
            }
            
            .grid-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 20px;
            }
            
            .field {
              display: flex;
              flex-direction: column;
            }
            .field-label {
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #6b7280;
              font-weight: 700;
              margin-bottom: 2px;
            }
            .field-value {
              font-size: 10px;
              font-weight: 600;
              color: #1f2937;
            }
            .field-value.italic {
              font-style: italic;
            }
            
            .text-block {
              font-size: 10px;
              color: #374151;
              line-height: 1.5;
              text-align: justify;
              white-space: pre-wrap;
              background-color: #f9fafb;
              padding: 8px;
              border: 1px solid #f3f4f6;
              border-radius: 2px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }
            tr {
              page-break-inside: avoid;
            }
            th {
              background-color: #f9fafb;
              border-bottom: 1.5px solid #e5e7eb;
              color: #374151;
              font-size: 8px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              padding: 6px 8px;
              text-align: left;
            }
            td {
              border-bottom: 1px solid #f3f4f6;
              padding: 6px 8px;
              font-size: 9px;
            }
            .td-idx {
              width: 30px;
              font-family: monospace;
              color: #6b7280;
            }
            
            .footer {
              margin-top: 30px;
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
              font-size: 8px;
              color: #9ca3af;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-title-container">
              <span class="title">Scheda Registro Volume</span>
              <span class="subtitle">Biblioteca Personale / Registro Bibliotecario</span>
            </div>
            <div>
              <span class="codice">${formData.codice || 'N/D'}</span>
            </div>
          </div>
          
          <div>
            <h1 class="book-title">${formData.titolo || 'Senza Titolo'}</h1>
            <div class="book-author">di ${formData.autore || 'Autore Sconosciuto'}</div>
          </div>
          
          <div class="section-title">Anagrafica Bibliografica</div>
          <div class="grid-container">
            <div class="field">
              <span class="field-label">Genere</span>
              <span class="field-value">${formData.genere || '-'}</span>
            </div>
            <div class="field">
              <span class="field-label">Editore</span>
              <span class="field-value">${formData.editore || '-'} ${formData.edizione ? `(${formData.edizione})` : ''}</span>
            </div>
            <div class="field">
              <span class="field-label">Collana</span>
              <span class="field-value">${formData.collana || '-'}</span>
            </div>
            <div class="field">
              <span class="field-label">Anno di Pubblicazione</span>
              <span class="field-value">${formData.anno || '-'}</span>
            </div>
            <div class="field">
              <span class="field-label">Nazione</span>
              <span class="field-value">${formData.nazione || '-'}</span>
            </div>
            <div class="field">
              <span class="field-label">Collocazione / Scaffale</span>
              <span class="field-value">${formData.scaffale || '-'}</span>
            </div>
            <div class="field">
              <span class="field-label">Formato Fisico</span>
              <span class="field-value">${formData.formato || '-'}</span>
            </div>
            <div class="field">
              <span class="field-label">Pagine</span>
              <span class="field-value">${formData.pagine || '-'}</span>
            </div>
          </div>

          <div class="section-title">Dettagli Opera & Lingua</div>
          <div class="grid-container">
            <div class="field">
              <span class="field-label">Tipo di componimento</span>
              <span class="field-value">${formData.isRomanzo ? 'Romanzo' : 'Antologia / Raccolta / Altro'}</span>
            </div>
            <div class="field">
              <span class="field-label">Lingua originale dell'edizione</span>
              <span class="field-value">${formData.isLinguaOriginale ? 'Sì (Italiano / Originale)' : 'No (Opera Tradotta)'}</span>
            </div>
            ${!formData.isLinguaOriginale ? `
            <div class="field">
              <span class="field-label">Titolo Originale</span>
              <span class="field-value italic">${formData.titoloOriginale || '-'}</span>
            </div>
            <div class="field">
              <span class="field-label">Traduttore</span>
              <span class="field-value">${formData.traduttore || '-'}</span>
            </div>
            ` : ''}
          </div>

          <div class="section-title">Acquisto & Disponibilità</div>
          <div class="grid-container">
            <div class="field">
              <span class="field-label">Tipo di Proprietà</span>
              <span class="field-value">${formData.diProprieta ? 'Di Proprietà' : 'In prestito / Altro'}</span>
            </div>
            ${formData.diProprieta ? `
            <div class="field">
              <span class="field-label">Data di Acquisizione</span>
              <span class="field-value">${formData.proprietaDal ? new Date(formData.proprietaDal).toLocaleDateString('it-IT') : '-'}</span>
            </div>
            ${formData.proprietaDi ? `
            <div class="field">
              <span class="field-label">Acquistato presso / Donato da</span>
              <span class="field-value">${formData.proprietaDi}</span>
            </div>` : ''}
            ` : ''}
            
            <div class="field">
              <span class="field-label">Stato Prestito</span>
              <span class="field-value">${formData.inPrestito ? `In Prestito a: ${formData.prestitoA || 'N/D'}` : 'Disponibile / Non in prestito'}</span>
            </div>
            ${formData.inPrestito && formData.prestitoDal ? `
            <div class="field">
              <span class="field-label">Inizio Prestito</span>
              <span class="field-value">${new Date(formData.prestitoDal).toLocaleDateString('it-IT')}</span>
            </div>
            ` : ''}
          </div>

          ${formData.riassunto ? `
          <div class="section-title">Sinossi / Riassunto</div>
          <div class="text-block">${formData.riassunto.replace(/\n/g, '<br/>')}</div>
          ` : ''}

          ${formData.commento ? `
          <div class="section-title">Valutazione / Note Personali</div>
          <div class="text-block">${formData.commento.replace(/\n/g, '<br/>')}</div>
          ` : ''}

          ${formData.racconti && formData.racconti.length > 0 ? `
          <div class="section-title">Racconti Contenuti (${formData.racconti.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">N°</th>
                <th>Autore racconto</th>
                <th>Titolo del racconto</th>
              </tr>
            </thead>
            <tbody>
              ${formData.racconti.map((r, idx) => `
              <tr>
                <td class="td-idx">${idx + 1}</td>
                <td style="font-weight: 600;">${r.autore || '-'}</td>
                <td style="font-style: italic;">${r.titolo}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}

          <div class="footer">
            Scheda stampata il: ${new Date().toLocaleDateString('it-IT')} con il software Registro Bibliotecario.
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.parent.document.body.removeChild(window.frameElement);
                }, 100);
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();
  };

  return (
    <form onSubmit={handleSubmit} className="relative px-6 md:px-8">
      {/* Sticky Header Actions */}
      <div className="sticky top-0 z-30 bg-editorial-bg/95 backdrop-blur-md border-b border-editorial-text/10 px-6 md:px-8 py-3 md:py-4 -mx-6 md:-mx-8 mb-6 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-xl md:text-xl font-bold italic tracking-tight text-editorial-text">
            {initialData ? "Scheda Volume" : "Nuovo Volume"}
          </h2>
          <span className="font-sans text-[9px] md:text-[8px] uppercase tracking-[0.2em] font-black opacity-40">Registro Bibliotecario</span>
        </div>
        <div className="flex items-center gap-2 md:gap-2">
          {initialData?.id && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-3 md:p-2 border border-red-200 hover:bg-red-50 text-red-600 transition-colors rounded-sm mr-2"
              title="Elimina Volume"
            >
              <Trash2 size={22} className="md:w-[18px] md:h-[18px]" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-3 md:p-2 border border-editorial-text/10 hover:bg-black/5 transition-colors rounded-sm"
            title="Annulla"
          >
            <X size={22} className="md:w-[18px] md:h-[18px]" />
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="p-3 md:p-2 border border-editorial-text/10 hover:bg-black/5 text-editorial-text transition-colors rounded-sm"
            title="Stampa Scheda Volume"
          >
            <Printer size={22} className="md:w-[18px] md:h-[18px]" />
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-editorial-text text-editorial-bg p-3 md:p-2 border border-editorial-text hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 rounded-sm"
            title="Salva Volume"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 md:w-4.5 md:h-4.5 animate-spin" />
            ) : (
              <Save size={22} className="md:w-[18px] md:h-[18px]" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-8 pb-12">
        {/* Sezione 1: Identità */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <BookOpen className="text-editorial-text w-4 h-4 opacity-70" />
            <span className="font-sans text-[11px] md:text-[10px] uppercase tracking-[0.15em] font-black opacity-70 italic">Anagrafica</span>
            <div className="flex-1 h-[1px] bg-editorial-text opacity-10" />
          </div>
          <div className="grid grid-cols-1 gap-y-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                <Info size={12} className="opacity-100" /> Titolo del Volume *
              </label>
              <textarea
                required
                name="titolo"
                value={formData.titolo}
                onChange={handleChange}
                rows={2}
                className="w-full bg-transparent border-b border-editorial-text/30 py-2 text-2xl font-black tracking-tight focus:outline-none focus:border-editorial-text transition-colors placeholder:text-editorial-text/20 resize-none"
                placeholder="Titolo..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                  <Tag size={12} className="opacity-100" /> Codice Inventario
                </label>
                <textarea
                  name="codice"
                  value={formData.codice}
                  onChange={handleChange}
                  rows={1}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text resize-none"
                  placeholder="es. BN-0001"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                  <User size={12} className="opacity-100" /> Autore / Scrittore
                </label>
                <div className="relative">
                  <input
                    name="autore"
                    value={formData.autore}
                    onChange={handleChange}
                    onFocus={() => setActiveSuggestion('autore')}
                    onBlur={() => setTimeout(() => setActiveSuggestion(null), 200)}
                    className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text"
                    placeholder="Nome Autore..."
                    autoComplete="off"
                  />
                  {activeSuggestion === 'autore' && formData.autore.length >= 3 && dynamicSuggestions.autore.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                      {dynamicSuggestions.autore.map(a => (
                        <button 
                          key={a} 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, autore: a }))}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none font-bold text-neutral-800"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                  <BookOpen size={12} className="opacity-100" /> Titolo Originale
                </label>
                <textarea
                  name="titoloOriginale"
                  value={formData.titoloOriginale}
                  onChange={handleChange}
                  rows={1}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text resize-none"
                  placeholder="Se tradotto..."
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                  <Languages size={12} className="opacity-100" /> Traduttore
                </label>
                <textarea
                  name="traduttore"
                  value={formData.traduttore}
                  onChange={handleChange}
                  rows={1}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text resize-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Sezione 2: Dati Tecnici */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-editorial-text w-4 h-4 opacity-70" />
            <span className="font-sans text-[11px] md:text-[10px] uppercase tracking-[0.25em] font-black opacity-70 italic">Dati Tecnici</span>
            <div className="flex-1 h-[1px] bg-editorial-text opacity-10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">Casa Editrice</label>
              <div className="relative">
                <input 
                  name="editore" 
                  value={formData.editore} 
                  onChange={handleChange} 
                  onFocus={() => setActiveSuggestion('editore')}
                  onBlur={() => setTimeout(() => setActiveSuggestion(null), 200)}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text" 
                  placeholder="Nome Editore..." 
                  autoComplete="off"
                />
                {activeSuggestion === 'editore' && formData.editore.length >= 3 && dynamicSuggestions.editore.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                    {dynamicSuggestions.editore.map(e => (
                      <button 
                        key={e} 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, editore: e }))}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none font-bold text-neutral-800"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">Collana Editoriale</label>
              <div className="relative">
                <input 
                  name="collana" 
                  value={formData.collana} 
                  onChange={handleChange} 
                  onFocus={() => setActiveSuggestion('collana')}
                  onBlur={() => setTimeout(() => setActiveSuggestion(null), 200)}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text" 
                  placeholder="es. I Classici" 
                  autoComplete="off"
                />
                {activeSuggestion === 'collana' && formData.collana.length >= 3 && dynamicSuggestions.collana.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                    {dynamicSuggestions.collana.map(c => (
                      <button 
                        key={c} 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, collana: c }))}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none font-bold text-neutral-800"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">Categoria / Genere</label>
              <div className="relative">
                <input 
                  name="genere" 
                  value={formData.genere} 
                  onChange={handleChange} 
                  onFocus={() => setActiveSuggestion('genere')}
                  onBlur={() => setTimeout(() => setActiveSuggestion(null), 200)}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text" 
                  placeholder="es. Narrativa" 
                  autoComplete="off"
                />
                {activeSuggestion === 'genere' && formData.genere.length >= 3 && dynamicSuggestions.genere.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                    {dynamicSuggestions.genere.map(g => (
                      <button 
                        key={g} 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, genere: g }))}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none font-bold text-neutral-800"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">Collocazione (Scaffale)</label>
              <textarea name="scaffale" value={formData.scaffale} onChange={handleChange} rows={1} className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text resize-none" placeholder="es. A-1" />
            </div>
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">Nazione</label>
              <div className="relative">
                <input 
                  name="nazione" 
                  value={formData.nazione} 
                  onChange={handleChange} 
                  onFocus={() => setActiveSuggestion('nazione')}
                  onBlur={() => setTimeout(() => setActiveSuggestion(null), 200)}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text" 
                  placeholder="es. Italia" 
                  autoComplete="off"
                />
                {activeSuggestion === 'nazione' && formData.nazione.length >= 3 && dynamicSuggestions.nazione.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                    {dynamicSuggestions.nazione.map(n => (
                      <button 
                        key={n} 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, nazione: n }))}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none font-bold text-neutral-800"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">Anno di Pubblicazione</label>
              <input type="number" name="anno" value={formData.anno} onChange={handleChange} className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text" />
            </div>
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">Numero Pagine</label>
              <input type="number" name="pagine" value={formData.pagine} onChange={handleChange} className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text" />
            </div>
          </div>
        </section>

        {/* Sezione Stato e Proprietà */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-4 bg-white/50 border border-editorial-text/10 rounded-sm space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="inPrestito" className="w-4.5 h-4.5 accent-editorial-text" checked={formData.inPrestito} onChange={() => handleCheckbox('inPrestito')} />
              <label htmlFor="inPrestito" className="text-[11px] font-black uppercase tracking-widest cursor-pointer opacity-80">In Prestito</label>
            </div>
            {formData.inPrestito && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <input type="date" name="prestitoDal" value={formData.prestitoDal} onChange={handleChange} className="bg-editorial-bg border border-editorial-text/20 py-1 px-2 text-xs font-bold" />
                <input name="prestitoA" value={formData.prestitoA} onChange={handleChange} className="bg-editorial-bg border border-editorial-text/20 py-1 px-2 text-xs font-bold" placeholder="A chi?..." />
              </div>
            )}
          </div>
          <div className="p-4 bg-white/50 border border-editorial-text/10 rounded-sm space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="diProprieta" className="w-4.5 h-4.5 accent-editorial-text" checked={formData.diProprieta} onChange={() => handleCheckbox('diProprieta')} />
              <label htmlFor="diProprieta" className="text-[11px] font-black uppercase tracking-widest cursor-pointer opacity-80">Proprietà</label>
            </div>
            <div className="pt-1">
              <input name="proprietaDi" value={formData.proprietaDi} onChange={handleChange} className="w-full bg-editorial-bg border border-editorial-text/20 py-1 px-2 text-xs font-bold" placeholder="Proprietario..." />
            </div>
          </div>
        </section>

        {/* Sezione Note */}
        <section className="space-y-3">
          <label className="font-sans text-[10px] md:text-[9px] font-black uppercase tracking-wider text-editorial-text opacity-80">Note Autore / Riassunto</label>
          <textarea 
            name="riassunto" 
            value={formData.riassunto} 
            onChange={handleChange} 
            rows={4}
            className="w-full bg-white/40 border border-editorial-text/20 p-3 text-sm font-medium italic leading-relaxed focus:outline-none focus:border-editorial-text/40" 
            placeholder="Annotazioni..."
          />
        </section>

        {/* Sezione Racconti */}
        <section className="space-y-4 pt-4 border-t border-editorial-text/10">
          <div className="flex items-center gap-3">
            <BookText className="text-editorial-text w-4 h-4 opacity-70" />
            <span className="font-sans text-[11px] md:text-[10px] uppercase tracking-[0.25em] font-black opacity-70 italic">Racconti Contenuti</span>
            <div className="flex-1 h-[1px] bg-editorial-text opacity-10" />
          </div>
          <p className="font-sans text-[11px] text-neutral-500 leading-relaxed uppercase tracking-wider font-bold">
            Gestisci l'elenco dei racconti presenti all'interno di questo volume usando la tabella dinamica:
          </p>

          <div className="bg-white/45 border border-editorial-text/15 rounded-sm overflow-hidden shadow-sm">
            {/* Tabella dei Racconti */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="border-b border-editorial-text/15 bg-neutral-100 text-[10px] uppercase tracking-wider font-black text-neutral-700">
                    <th className="py-2.5 px-3 w-10 text-center">N°</th>
                    <th className="py-2.5 px-3">Autore</th>
                    <th className="py-2.5 px-3">Titolo del racconto</th>
                    <th className="py-2.5 px-3 w-48 text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-editorial-text/10">
                  {(!formData.racconti || formData.racconti.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-6 px-3 text-center italic text-neutral-400 font-serif">
                        Nessun racconto inserito in questo volume. Compila i campi sottostanti per aggiungerne uno.
                      </td>
                    </tr>
                  ) : (
                    formData.racconti.map((racconto, idx) => {
                      const isEditing = editingRaccontoId === racconto.id;
                      return (
                        <tr key={racconto.id} className={cn("transition-colors", isEditing ? "bg-amber-50/40" : "hover:bg-neutral-50")}>
                          <td className="py-2.5 px-3 text-center font-mono text-[10px] text-neutral-500 font-bold">{idx + 1}</td>
                          {isEditing ? (
                            <>
                              <td className="py-1.5 px-3 relative">
                                <input
                                  type="text"
                                  value={editingRaccontoAutore}
                                  onChange={(e) => setEditingRaccontoAutore(e.target.value)}
                                  onFocus={() => setActiveSuggestion('editingRaccontoAutore')}
                                  onBlur={() => setTimeout(() => setActiveSuggestion(null), 250)}
                                  className="w-full bg-white border border-neutral-300 rounded-sm py-1 px-2.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-editorial-text transition-colors"
                                  placeholder="Autore racconto"
                                  autoComplete="off"
                                />
                                {activeSuggestion === 'editingRaccontoAutore' && editingRaccontoAutore.length >= 3 && dynamicSuggestions.editingRaccontoAutore.length > 0 && (
                                  <div className="absolute left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200" style={{ top: '100%', left: '12px', width: 'calc(100% - 24px)', marginTop: '4px' }}>
                                    {dynamicSuggestions.editingRaccontoAutore.map(a => (
                                      <button 
                                        key={a} 
                                        type="button"
                                        onClick={() => setEditingRaccontoAutore(a)}
                                        className="w-full text-left px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none font-bold"
                                      >
                                        {a}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="py-1.5 px-3">
                                <input
                                  type="text"
                                  value={editingRaccontoTitolo}
                                  onChange={(e) => setEditingRaccontoTitolo(e.target.value)}
                                  className="w-full bg-white border border-neutral-300 rounded-sm py-1 px-2.5 text-xs font-bold text-neutral-900 font-serif italic focus:outline-none focus:border-editorial-text transition-colors"
                                  placeholder="Titolo racconto *"
                                />
                              </td>
                              <td className="py-1.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRacconto(racconto.id)}
                                    disabled={!editingRaccontoTitolo.trim()}
                                    className="p-1 px-2 border border-emerald-200 hover:bg-emerald-50 text-emerald-600 rounded-sm font-sans text-[9px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1 active:scale-95 disabled:opacity-50 disabled:bg-neutral-100 disabled:border-neutral-200"
                                    title="Salva modifiche"
                                    style={{ minHeight: '28px' }}
                                  >
                                    <Check size={11} />
                                    Salva
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditRacconto}
                                    className="p-1 px-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-sm font-sans text-[9px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1 active:scale-95"
                                    title="Annulla"
                                    style={{ minHeight: '28px' }}
                                  >
                                    <X size={11} />
                                    Annulla
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 px-3 text-neutral-700 font-medium">{racconto.autore || <span className="text-neutral-300 italic">Nessun autore</span>}</td>
                              <td className="py-2.5 px-3 font-serif italic text-sm font-semibold text-neutral-900">{racconto.titolo}</td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditRacconto(racconto)}
                                    className="p-1 px-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-sm font-sans text-[9px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1 active:scale-95"
                                    title="Modifica racconto"
                                    style={{ minHeight: '28px' }}
                                  >
                                    <Edit2 size={11} />
                                    Modifica
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRacconto(racconto.id)}
                                    className="p-1 px-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-sm font-sans text-[9px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1 active:scale-95"
                                    title="Rimuovi racconto"
                                    style={{ minHeight: '28px' }}
                                  >
                                    <Trash2 size={11} />
                                    Rimuovi
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Form d'Inserimento per Nuovo Racconto */}
            <div className="p-4 bg-neutral-50 border-t border-editorial-text/15">
              <h4 className="text-[10px] uppercase tracking-wider font-black text-neutral-600 mb-2.5">Aggiungi racconto all'elenco:</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1 relative">
                  <div className="flex items-center justify-between h-4">
                    <label className="text-[9px] uppercase tracking-wider font-black text-neutral-500">Autore del Racconto</label>
                    {formData.autore && (
                      <button
                        type="button"
                        onClick={handleUseBookAuthor}
                        className="text-[8px] font-black uppercase tracking-wider text-neutral-500 underline hover:text-black transition-colors"
                      >
                        Copia autore volume
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newRaccontoAutore}
                    onChange={(e) => setNewRaccontoAutore(e.target.value)}
                    onFocus={() => setActiveSuggestion('raccontoAutore')}
                    onBlur={() => setTimeout(() => setActiveSuggestion(null), 250)}
                    placeholder="es. Edgar Allan Poe"
                    className="w-full bg-white border border-editorial-text/20 rounded-sm py-1.5 px-2.5 text-xs font-bold leading-none placeholder:text-neutral-300 text-neutral-900 focus:outline-none focus:border-editorial-text transition-colors"
                    autoComplete="off"
                  />
                  {activeSuggestion === 'raccontoAutore' && newRaccontoAutore.length >= 3 && dynamicSuggestions.raccontoAutore.length > 0 && (
                    <div className="absolute left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200" style={{ top: '100%', marginTop: '4px' }}>
                      {dynamicSuggestions.raccontoAutore.map(a => (
                        <button 
                          key={a} 
                          type="button"
                          onClick={() => setNewRaccontoAutore(a)}
                          className="w-full text-left px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none font-bold"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between h-4">
                    <label className="text-[9px] uppercase tracking-wider font-black text-neutral-500">Titolo del Racconto *</label>
                  </div>
                  <input
                    type="text"
                    value={newRaccontoTitolo}
                    onChange={(e) => setNewRaccontoTitolo(e.target.value)}
                    placeholder="es. La lettera rubata"
                    className="w-full bg-white border border-editorial-text/20 rounded-sm py-1.5 px-2.5 text-xs font-bold leading-none placeholder:text-neutral-300 text-neutral-900 focus:outline-none focus:border-editorial-text transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddRacconto}
                  disabled={!newRaccontoTitolo.trim()}
                  className="bg-black hover:bg-neutral-800 text-white disabled:bg-neutral-300 disabled:opacity-50 py-2 px-3.5 rounded-sm font-sans text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  style={{ minHeight: '38px' }}
                >
                  <Plus size={12} strokeWidth={3} />
                  Aggiungi Racconto
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
