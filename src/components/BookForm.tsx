import React, { useState, useEffect } from "react";
import { Book } from "../types";
import { libraryService } from "../services/libraryService";
import { Save, Loader2, BookOpen, Info, User, Tag, Calendar, MapPin, Layers, BookText, ShieldCheck, Languages, X, Trash2 } from "lucide-react";
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
    }
  );

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
                  {activeSuggestion === 'autore' && formData.autore.length >= 2 && suggestions?.autores && suggestions.autores.length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto">
                      {suggestions.autores
                        .filter(a => !formData.autore || a.toLowerCase().includes(formData.autore.toLowerCase()))
                        .map(a => (
                          <button 
                            key={a} 
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, autore: a }))}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none"
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
                {activeSuggestion === 'editore' && formData.editore.length >= 2 && suggestions?.editores && suggestions.editores.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto">
                    {suggestions.editores
                      .filter(e => !formData.editore || e.toLowerCase().includes(formData.editore.toLowerCase()))
                      .map(e => (
                        <button 
                          key={e} 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, editore: e }))}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none"
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
                {activeSuggestion === 'collana' && formData.collana.length >= 2 && suggestions?.collanas && suggestions.collanas.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto">
                    {suggestions.collanas
                      .filter(c => !formData.collana || c.toLowerCase().includes(formData.collana.toLowerCase()))
                      .map(c => (
                        <button 
                          key={c} 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, collana: c }))}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none"
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
                {activeSuggestion === 'genere' && formData.genere.length >= 2 && suggestions?.generes && suggestions.generes.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto">
                    {suggestions.generes
                      .filter(g => !formData.genere || g.toLowerCase().includes(formData.genere.toLowerCase()))
                      .map(g => (
                        <button 
                          key={g} 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, genere: g }))}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none"
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
                {activeSuggestion === 'nazione' && formData.nazione.length >= 2 && suggestions?.naziones && suggestions.naziones.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-editorial-text/10 shadow-2xl z-50 max-h-[150px] overflow-y-auto">
                    {suggestions.naziones
                      .filter(n => !formData.nazione || n.toLowerCase().includes(formData.nazione.toLowerCase()))
                      .map(n => (
                        <button 
                          key={n} 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, nazione: n }))}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 transition-colors border-b border-editorial-text/5 last:border-none"
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
      </div>
    </form>
  );
}
