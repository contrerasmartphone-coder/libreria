import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { libraryService } from '../services/libraryService';

interface BulkUpdateFormProps {
  filters: { autore?: string; genere?: string; editore?: string; collana?: string };
  searchTerm: string;
  totalCount: number;
  onClose: () => void;
  onSuccess: (count: number) => void;
  onError: (error: string) => void;
}

const UPDATEABLE_FIELDS = [
  { id: 'genere', label: 'Categoria / Genere' },
  { id: 'editore', label: 'Casa Editrice' },
  { id: 'collana', label: 'Collana Editoriale' },
  { id: 'nazione', label: 'Nazione' },
  { id: 'scaffale', label: 'Collocazione (Scaffale)' },
  { id: 'proprietaDi', label: 'Proprietà Di' },
  { id: 'commento', label: 'Note / Commento' },
];

export default function BulkUpdateForm({ filters, searchTerm, totalCount, onClose, onSuccess, onError }: BulkUpdateFormProps) {
  const [selectedField, setSelectedField] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedField) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const count = await libraryService.bulkUpdateBooks(
        filters,
        searchTerm,
        selectedField,
        newValue
      );
      onSuccess(count);
      onClose();
    } catch (err: any) {
      onError(err.message || "Errore durante l'aggiornamento massivo");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-editorial-bg/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white border border-editorial-text/10 shadow-2xl w-full max-w-lg p-8 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-neutral-100 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="font-serif text-3xl font-black mb-2 tracking-tight">Aggiorna Gruppo</h2>
        <div className="flex items-center gap-3 mb-8">
          <div className="px-2 py-1 bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider rounded">
            {totalCount} Volumi Selezionati
          </div>
          <p className="text-sm text-editorial-text/60 font-medium whitespace-nowrap">
            corrispondenti ai filtri attuali
          </p>
        </div>

        {!showConfirm ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                Campo da aggiornare
              </label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                required
                className="w-full bg-transparent border-b border-editorial-text/30 py-2 text-lg font-black focus:outline-none focus:border-editorial-text appearance-none cursor-pointer"
              >
                <option value="">Seleziona un campo...</option>
                {UPDATEABLE_FIELDS.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-sans text-xs font-black uppercase tracking-wider text-editorial-text opacity-90">
                Nuovo Valore
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full bg-transparent border-b border-editorial-text/30 py-2 text-lg font-black focus:outline-none focus:border-editorial-text"
                placeholder="Inserisci il nuovo valore..."
              />
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 font-black uppercase tracking-[0.2em] text-[10px] border border-editorial-text/20 hover:bg-neutral-50 transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={!selectedField}
                className="flex-1 py-4 font-black uppercase tracking-[0.2em] text-[10px] bg-editorial-text text-white hover:bg-black transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
              >
                <Save size={14} /> Procedi
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 text-center py-4">
            <div className="flex justify-center">
              <AlertCircle size={48} className="text-red-600 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black mb-2">Confermi l'aggiornamento?</h3>
              <p className="text-sm text-editorial-text/70">
                Stai per aggiornare <span className="font-bold">{totalCount} volumi</span>. 
              </p>
              <p className="text-sm text-editorial-text/70 mt-1">
                Il campo <span className="font-bold">"{UPDATEABLE_FIELDS.find(f => f.id === selectedField)?.label}"</span> verrà impostato a <span className="font-bold italic">"{newValue || '(vuoto)'}"</span>.
              </p>
              <p className="text-xs text-red-600 mt-4 font-black uppercase tracking-wider">
                Questa azione è irreversibile.
              </p>
            </div>
            
            <div className="pt-4 flex gap-4">
              <button
                disabled={loading}
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-4 font-black uppercase tracking-[0.2em] text-[10px] border border-editorial-text/20 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Torna Indietro
              </button>
              <button
                disabled={loading}
                onClick={handleConfirm}
                className="flex-1 py-4 font-black uppercase tracking-[0.2em] text-[10px] bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Aggiornamento..." : "Sì, Aggiorna Tutto"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
