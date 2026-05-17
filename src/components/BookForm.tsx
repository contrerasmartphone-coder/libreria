import React, { useState } from "react";
import { Book } from "../types";
import { libraryService } from "../services/libraryService";
import { Save, Loader2, BookOpen, Info, User, Tag, Calendar, MapPin, Layers, BookText, ShieldCheck, Languages, X, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

interface BookFormProps {
  initialData?: Book;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: (id: string | undefined) => Promise<void>;
}

export default function BookForm({ initialData, onClose, onSuccess, onDelete }: BookFormProps) {
  const [loading, setLoading] = useState(false);
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
      alert("Errore durante il salvataggio: " + (error.message || "Errore sconosciuto"));
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
    <form onSubmit={handleSubmit} className="relative font-serif px-6 md:px-8">
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
              <input
                required
                name="titolo"
                value={formData.titolo}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-editorial-text/30 py-2 text-2xl font-black tracking-tight focus:outline-none focus:border-editorial-text transition-colors placeholder:text-editorial-text/20"
                placeholder="Titolo..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                  <Tag size={12} className="opacity-100" /> Codice Inventario
                </label>
                <input
                  name="codice"
                  value={formData.codice}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text"
                  placeholder="es. BN-0001"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                  <User size={12} className="opacity-100" /> Autore / Scrittore
                </label>
                <input
                  name="autore"
                  value={formData.autore}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text"
                  placeholder="Nome Autore..."
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                  <BookOpen size={12} className="opacity-100" /> Titolo Originale
                </label>
                <input
                  name="titoloOriginale"
                  value={formData.titoloOriginale}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text"
                  placeholder="Se tradotto..."
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                  <Languages size={12} className="opacity-100" /> Traduttore
                </label>
                <input
                  name="traduttore"
                  value={formData.traduttore}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text"
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
              <input name="editore" value={formData.editore} onChange={handleChange} className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text" placeholder="Nome Editore..." />
            </div>
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">Collana Editoriale</label>
              <input name="collana" value={formData.collana} onChange={handleChange} className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text" placeholder="es. I Classici" />
            </div>
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">Categoria / Genere</label>
              <input name="genere" value={formData.genere} onChange={handleChange} className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text" placeholder="es. Narrativa" />
            </div>
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">Collocazione (Scaffale)</label>
              <input name="scaffale" value={formData.scaffale} onChange={handleChange} className="w-full bg-transparent border-b border-editorial-text/30 py-1.5 text-lg font-black focus:outline-none focus:border-editorial-text" placeholder="es. A-1" />
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
