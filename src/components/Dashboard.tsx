import React, { useState, useEffect } from "react";
import { Plus, Search, Filter, BookText, Grid, List as ListIcon, X, FileUp, Menu, ChevronLeft, LogOut } from "lucide-react";
import { libraryService } from "../services/libraryService";
import { Book } from "../types";
import { motion, AnimatePresence } from "motion/react";
import BookForm from "./BookForm";
import BookCard from "./BookCard";
import ImportModal from "./ImportModal";
import Toast, { ToastType } from "./Toast";
import { cn } from "../lib/utils";


interface DashboardProps {
  user: any;
  isAdmin: boolean;
  search: string;
  isMenuOpen: boolean;
  setIsMenuOpen: (val: boolean) => void;
  viewMode: "grid" | "list";
  isFormOpen: boolean;
  setIsFormOpen: (val: boolean) => void;
  useLocalMode: boolean;
  onLogout: () => void;
  onCountsChange: (total: number, filtered: number) => void;
}

export default function Dashboard({ 
  user, 
  isAdmin, 
  search, 
  isMenuOpen, 
  setIsMenuOpen,
  viewMode, 
  isFormOpen, 
  setIsFormOpen,
  useLocalMode,
  onLogout,
  onCountsChange
}: DashboardProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalFilteredBooks, setTotalFilteredBooks] = useState(0);
  const [absoluteTotalBooks, setAbsoluteTotalBooks] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const PAGE_SIZE = 48;
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Sorting and Filtering states
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<{ autore?: string; genere?: string; editore?: string }>({});
  const [filterOptions, setFilterOptions] = useState<{ autores: string[], generes: string[], editores: string[] }>({
    autores: [], generes: [], editores: []
  });
  
  // Feedback State
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: "",
    type: "success",
    isVisible: false
  });

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type, isVisible: true });
  };

  const isCloudEnabled = libraryService.isCloudEnabled;

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks(true, search);
    }, 600);
    return () => clearTimeout(timer);
  }, [search, sortBy, sortOrder, filters]);

  useEffect(() => {
    loadFilterOptions();
  }, [absoluteTotalBooks]);

  useEffect(() => {
    if (!isFormOpen) {
      setEditingBook(undefined);
    }
  }, [isFormOpen]);

  const loadFilterOptions = async () => {
    try {
      const options = await libraryService.getFilterOptions();
      setFilterOptions(options);
    } catch (e) {
      console.error("Errore caricamento opzioni filtro:", e);
    }
  };

  useEffect(() => {
    if (user?.email || !isCloudEnabled) {
      fetchAbsoluteTotal();
    }
  }, [user?.email, isAdmin, isCloudEnabled]);

  const fetchBooks = async (isInitial = true, currentSearch?: string) => {
    const pageToFetch = isInitial ? 0 : currentPage + 1;
    
    if (isInitial) {
      setLoading(true);
      setCurrentPage(0);
      setQuotaExceeded(false);
    } else {
      setLoadingMore(true);
    }

    console.log("Fetching books...", { isInitial, pageToFetch, currentSearch, sortBy, sortOrder, filters });

    try {
      const result = await libraryService.getBooksPaginated(
        PAGE_SIZE, 
        pageToFetch,
        currentSearch,
        sortBy,
        sortOrder,
        filters
      );
      
      console.log("Books fetched result:", { count: result.books.length, total: result.total });

      if (isInitial) {
        setBooks(result.books);
      } else {
        setBooks(prev => {
          const newBooks = result.books.filter(nb => !prev.some(pb => {
            if (pb.id && nb.id) return pb.id === nb.id;
            if (pb.codice && nb.codice) return pb.codice === nb.codice;
            return false;
          }));
          return [...prev, ...newBooks];
        });
      }
      
      setCurrentPage(pageToFetch);
      setTotalFilteredBooks(result.total);
      
      // Update absolute total if not searching or if it's the initial load
      if (!currentSearch) {
        setAbsoluteTotalBooks(result.total);
        onCountsChange(result.total, result.total);
      } else {
        onCountsChange(absoluteTotalBooks, result.total);
      }
    } catch (error: any) {
      console.error("Errore nel recupero dei libri:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchAbsoluteTotal = async () => {
    try {
      const total = await libraryService.getTotalCount();
      setAbsoluteTotalBooks(total);
      onCountsChange(total, totalFilteredBooks || total);
    } catch (e) {
      console.error("Errore fetchAbsoluteTotal:", e);
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    if (confirm("Sei sicuro di voler eliminare questo libro dal registro?")) {
      try {
        await libraryService.deleteBook(id);
        showToast("Volume eliminato definitivamente");
        fetchBooks();
      } catch (e) {
        showToast("Impossibile eliminare il volume", "error");
      }
    }
  };

  return (
    <div className="flex h-full bg-editorial-bg overflow-hidden relative">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ 
          width: isMenuOpen ? 320 : 0, 
          opacity: isMenuOpen ? 1 : 0,
          x: isMenuOpen ? 0 : -320
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "border-r border-editorial-text/10 bg-editorial-bg flex flex-col relative overflow-hidden shrink-0 z-50",
          "fixed inset-y-0 left-0 lg:relative lg:translate-x-0"
        )}
      >
        <div className="w-[320px] flex flex-col h-full p-10 overflow-y-auto custom-scrollbar relative">
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-sm lg:hidden"
              title="Chiudi Menu"
            >
              <X size={20} className="text-editorial-text opacity-60" />
            </button>

            <section className="mb-10">
              <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] font-black mb-4 opacity-80 italic border-b border-editorial-text/10 pb-2">Statistiche</h3>
              <div className="flex items-baseline gap-2">
                <div className="text-4xl font-bold tracking-tighter">{absoluteTotalBooks}</div>
                <div className="font-sans text-[11px] uppercase tracking-widest font-black opacity-80">Volumi Totali</div>
              </div>
            </section>

            <section className="mb-8">
              <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] font-black mb-4 opacity-80 italic border-b border-editorial-text/10 pb-2">Ordinamento</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent border-none font-sans text-sm font-black focus:outline-none cursor-pointer"
                  >
                    <option value="created_at">Data Inserimento</option>
                    <option value="titolo">Titolo</option>
                    <option value="codice">Codice</option>
                    <option value="anno">Anno</option>
                  </select>
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1 hover:bg-black/5 rounded-sm transition-colors"
                  >
                    <Filter className={cn("w-3.5 h-3.5 transition-transform", sortOrder === 'asc' ? "rotate-180" : "")} />
                  </button>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] font-black mb-4 opacity-80 italic border-b border-editorial-text/10 pb-2">Filtri Avanzati</h3>
              <div className="space-y-5">
                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[10px] uppercase tracking-widest font-black opacity-100">Genere</label>
                  <select 
                    value={filters.genere || ""} 
                    onChange={(e) => setFilters(prev => ({ ...prev, genere: e.target.value || undefined }))}
                    className="bg-transparent border-b border-editorial-text/20 py-1 font-serif italic font-bold text-base focus:outline-none"
                  >
                    <option value="">Tutti i generi</option>
                    {filterOptions.generes.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[10px] uppercase tracking-widest font-black opacity-100">Autore</label>
                  <select 
                    value={filters.autore || ""} 
                    onChange={(e) => setFilters(prev => ({ ...prev, autore: e.target.value || undefined }))}
                    className="bg-transparent border-b border-editorial-text/20 py-1 font-serif italic font-bold text-base focus:outline-none"
                  >
                    <option value="">Tutti gli autori</option>
                    {filterOptions.autores.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-sans text-[10px] uppercase tracking-widest font-black opacity-100">Editore</label>
                  <select 
                    value={filters.editore || ""} 
                    onChange={(e) => setFilters(prev => ({ ...prev, editore: e.target.value || undefined }))}
                    className="bg-transparent border-b border-editorial-text/20 py-1 font-serif italic font-bold text-base focus:outline-none"
                  >
                    <option value="">Tutti gli editori</option>
                    {filterOptions.editores.map(ed => <option key={ed} value={ed}>{ed}</option>)}
                  </select>
                </div>

                {Object.values(filters).some(Boolean) && (
                  <button 
                    onClick={() => setFilters({})}
                    className="font-sans text-[11px] font-black uppercase tracking-widest text-red-700 hover:text-red-900 transition-colors flex items-center gap-2 mt-2"
                  >
                    <X size={12} /> Resetta filtri
                  </button>
                )}
              </div>
            </section>

          {isAdmin && (
            <section className="mb-10 border-t border-editorial-text/10 pt-8">
              <h3 className="font-sans text-xs uppercase tracking-[0.3em] font-black mb-6 opacity-60 italic text-blue-900">Gestione</h3>
              <div className="space-y-4">
                <button 
                  onClick={() => setIsImportOpen(true)}
                  className="flex items-center gap-3 font-sans text-xs font-black uppercase tracking-wider hover:underline w-full text-left"
                >
                  <FileUp size={14} /> Importa Archivio
                </button>
              </div>
            </section>
          )}

          <div className="mt-8">
            <button
              onClick={() => {
                setEditingBook(undefined);
                setIsFormOpen(true);
              }}
              className="w-full bg-editorial-text text-editorial-bg py-5 px-6 font-sans text-xs font-black uppercase tracking-[0.2em] shadow-xl skew-x-[-1deg] hover:skew-x-0 transition-transform active:scale-95 flex items-center justify-center gap-3"
            >
              <Plus size={14} /> Nuovo Libro
            </button>
          </div>

          <div className="mt-auto border-t border-editorial-text/10 pt-8 bg-editorial-bg pb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col font-sans">
                <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-60 leading-none mb-2">Operatore</span>
                <span className="text-sm font-black tracking-wider truncate max-w-[160px]">
                  {useLocalMode ? "Ospite" : (user?.user_metadata?.full_name || user?.email?.split('@')[0])}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-3 border border-editorial-text/10 hover:bg-red-50 hover:text-red-700 transition-all rounded-sm shadow-sm"
                title="Disconnetti"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      <section className="flex-1 flex flex-col min-w-0 h-full relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-12 scrollbar-hide">
          <div className="flex justify-between items-center mb-6 lg:mb-8">
            <h2 className="text-3xl lg:text-5xl italic tracking-tight font-bold">
              {search ? "Ricerca" : "Catalogo"}
            </h2>
          </div>

          {loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-10 h-[1px] bg-editorial-text animate-pulse mb-2" />
              <span className="font-sans text-[9px] uppercase tracking-[0.4em] opacity-20">
                {isCloudEnabled ? "Accesso Archivio Cloud" : "Lettura Database Locale"}
              </span>
            </div>
          ) : books.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10">
              <BookText size={64} />
              <span className="mt-6 font-sans text-[10px] uppercase tracking-[0.5em] font-black">Archivio Vuoto</span>
            </div>
          ) : (
            <>
              <div className={cn(
                "grid",
                viewMode === "grid" 
                  ? "grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 gap-y-6 md:gap-x-8 md:gap-y-12" 
                  : "grid-cols-1 gap-y-2"
              )}>
                <AnimatePresence mode="popLayout">
                  {books.map((book, index) => (
                    <motion.div
                      key={book.id || book.codice || `book-${index}`}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <BookCard 
                        book={book} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete}
                        viewMode={viewMode}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {books.length < (search ? totalFilteredBooks : absoluteTotalBooks) && (
                <div className="mt-20 flex justify-center">
                  <button
                    onClick={() => fetchBooks(false, search)}
                    disabled={loadingMore}
                    className="flex flex-col items-center group"
                  >
                    <div className={cn(
                      "w-12 h-[1px] bg-editorial-text transition-all mb-4",
                      loadingMore ? "w-24 animate-pulse" : "group-hover:w-24"
                    )} />
                    <span className="font-sans text-xs uppercase tracking-[0.4em] font-black opacity-80 group-hover:opacity-100 transition-opacity">
                      {loadingMore ? "Caricamento in corso..." : "Carica altri volumi"}
                    </span>
                    <span className="font-sans text-[10px] opacity-60 mt-2 uppercase tracking-widest">
                      Visualizzati {books.length} su {search ? totalFilteredBooks : absoluteTotalBooks}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <AnimatePresence>
        {isImportOpen && (
          <ImportModal 
            onClose={() => setIsImportOpen(false)} 
            onSuccess={() => {
              setIsImportOpen(false);
              showToast("Dati importati con successo");
              fetchBooks();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-editorial-text/20 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="relative w-full max-w-2xl bg-editorial-bg border-l border-editorial-text/10 shadow-[-40px_0_80px_rgba(0,0,0,0.1)] h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto">
                <BookForm 
                   initialData={editingBook} 
                   onClose={() => setIsFormOpen(false)} 
                   onDelete={handleDelete}
                   onSuccess={() => {
                     setIsFormOpen(false);
                     setEditingBook(undefined);
                     showToast(editingBook ? "Volume aggiornato correttamente" : "Nuovo volume registrato");
                     fetchBooks();
                   }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />
    </div>
  );
}
