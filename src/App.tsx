/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import Dashboard from "./components/Dashboard";
import { BookOpen, LogIn, LogOut, Library, ShieldAlert, Search, Menu, ChevronLeft, Grid, List as ListIcon, Plus, Type, Printer, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { libraryService } from "./services/libraryService";
import { supabase } from "./lib/supabase";

type FontTheme = "serif" | "sans" | "mono";

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [useLocalMode, setUseLocalMode] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [fontTheme, setFontTheme] = useState<FontTheme>(() => {
    return (localStorage.getItem("library-font-theme") as FontTheme) || "serif";
  });
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const isCloudEnabled = libraryService.isCloudEnabled;

  const [activeFilters, setActiveFilters] = useState<any>({});
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printBooks, setPrintBooks] = useState<any[]>([]);
  const [loadingPrintBooks, setLoadingPrintBooks] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    codice: true,
    titolo: true,
    autore: true,
    genere: true,
    editore: true,
    collana: false,
    anno: true,
    scaffale: true,
    pagine: false,
    nazione: false,
    commento: false,
    diProprieta: false,
    inPrestito: false
  });

  const fieldLabels = {
    codice: "Codice",
    titolo: "Titolo",
    autore: "Autore",
    genere: "Genere",
    editore: "Editore",
    collana: "Collana",
    anno: "Anno",
    scaffale: "Scaffale",
    pagine: "Pagine",
    nazione: "Nazione",
    commento: "Commento",
    diProprieta: "Proprietà",
    inPrestito: "Prestito"
  };

  const handleOpenPrintModal = async () => {
    setIsPrintModalOpen(true);
    setLoadingPrintBooks(true);
    try {
      const dbBooks = await libraryService.getAllFilteredBooks(
        debouncedSearch,
        sortBy,
        sortOrder,
        activeFilters
      );
      setPrintBooks(dbBooks);
    } catch (e) {
      console.error("Errore recupero libri per stampa:", e);
    } finally {
      setLoadingPrintBooks(false);
    }
  };

  useEffect(() => {
    if (isPrintModalOpen) {
      const updatePrintPreview = async () => {
        setLoadingPrintBooks(true);
        try {
          const dbBooks = await libraryService.getAllFilteredBooks(
            debouncedSearch,
            sortBy,
            sortOrder,
            activeFilters
          );
          setPrintBooks(dbBooks);
        } catch (e) {
          console.error("Errore caricamento anteprima:", e);
        } finally {
          setLoadingPrintBooks(false);
        }
      };
      updatePrintPreview();
    }
  }, [isPrintModalOpen, debouncedSearch, sortBy, sortOrder, activeFilters]);

  const handleActualPrint = () => {
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

    const selectedKeys = Object.entries(selectedFields)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key);

    const filterExplanations: string[] = [];
    if (debouncedSearch) filterExplanations.push(`Ricerca: "${debouncedSearch}"`);
    if (activeFilters.autore) filterExplanations.push(`Autore: "${activeFilters.autore}"`);
    if (activeFilters.genere) filterExplanations.push(`Genere: "${activeFilters.genere}"`);
    if (activeFilters.editore) filterExplanations.push(`Editore: "${activeFilters.editore}"`);
    if (activeFilters.collana) filterExplanations.push(`Collana: "${activeFilters.collana}"`);
    if (activeFilters.scaffale) filterExplanations.push(`Scaffale: "${activeFilters.scaffale}"`);
    if (activeFilters.nazione) filterExplanations.push(`Nazione: "${activeFilters.nazione}"`);

    const filterString = filterExplanations.length > 0 ? filterExplanations.join(" | ") : "Tutti i volumi";

    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Biblioteca - Registro Volumi</title>
          <style>
            @page {
              size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #1a1a1a;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.4;
            }
            .header {
              border-bottom: 2px solid #000;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .title {
              font-size: 18px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin: 0 0 6px 0;
            }
            .metadata {
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #555;
            }
            .stats {
              margin-top: 4px;
              font-weight: bold;
              color: #000;
              font-size: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th {
              background-color: #f7f7f7;
              border-bottom: 2px solid #000;
              color: #000;
              font-size: 9px;
              font-weight: 850;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              padding: 8px 6px;
              text-align: left;
            }
            td {
              border-bottom: 1px solid #eaeaea;
              padding: 8px 6px;
              font-size: 10px;
              word-break: break-word;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #eaeaea;
              padding-top: 10px;
              font-size: 8px;
              color: #777;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Biblioteca - Registro Volumi</div>
            <div class="metadata">
              <div>Esportato il: ${new Date().toLocaleDateString('it-IT')} ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
              <div>Filtri Applicati: ${filterString}</div>
              <div class="stats">Volumi Estratti: ${printBooks.length}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                ${selectedKeys.map(k => `<th>${(fieldLabels as any)[k]}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${printBooks.map(book => `
                <tr>
                  ${selectedKeys.map(k => {
                    let value = (book as any)[k];
                    if (k === 'diProprieta') {
                      value = value ? 'Sì' : 'No';
                    } else if (k === 'inPrestito') {
                      value = value ? `Sì (${book.prestitoA || 'N/D'})` : 'No';
                    } else if (k === 'isLinguaOriginale') {
                      value = value ? 'Sì' : 'No';
                    } else if (k === 'isRomanzo') {
                      value = value ? 'Sì' : 'No';
                    }
                    return `<td>${value !== null && value !== undefined && value !== "" ? value : '-'}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Estratto generato digitalmente dal gestionale Biblioteca - Pagina 1 di 1
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

  useEffect(() => {
    localStorage.setItem("library-font-theme", fontTheme);
    document.documentElement.setAttribute('data-theme', fontTheme);
  }, [fontTheme]);

  const toggleFontTheme = () => {
    const themes: FontTheme[] = ["serif", "sans", "mono"];
    const currentIndex = themes.indexOf(fontTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setFontTheme(themes[nextIndex]);
  };

  useEffect(() => {
    if (!isCloudEnabled) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        checkAuthorization(currentUser.email || null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        checkAuthorization(currentUser.email || null);
      } else {
        setIsAuthorized(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [isCloudEnabled]);

  const checkAuthorization = async (email: string | null) => {
    if (!email) {
      setIsAuthorized(null);
      return;
    }

    // For now, any authenticated user is authorized to use the system
    // if cloud is enabled and login was successful.
    setIsAuthorized(true);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!email || !password) {
      setLoginError("Inserisci email e password.");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (e: any) {
      console.error("Login error:", e);
      setLoginError(e.message || "Email o password non corretti.");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthorized(null);
      setUseLocalMode(false);
      setEmail("");
      setPassword("");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-editorial-bg flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Library className="w-12 h-12 text-editorial-text opacity-20" />
        </motion.div>
      </div>
    );
  }

  // Access Denied Screen
  if (user && isAuthorized === false) {
    return (
      <div className="min-h-screen bg-editorial-bg flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 shadow-2xl border border-red-100"
        >
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-4 italic">Accesso Negato</h2>
          <p className="font-sans text-lg opacity-80 mb-10 leading-relaxed text-editorial-text">
            Il tuo account (<span className="font-bold">{user.email}</span>) non è autorizzato ad accedere a questo sistema. Contatta l'amministratore per richiedere l'abilitazione.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-5 bg-editorial-text text-editorial-bg font-sans text-xs font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all active:scale-95"
          >
            TORNA AL LOGIN
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-editorial-bg text-editorial-text selection:bg-editorial-text selection:text-white`}>
      {!user && !useLocalMode ? (
        <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[280px] w-full"
          >
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-20 bg-editorial-text flex items-center justify-center shadow-2xl skew-y-3">
                <Library className="w-10 h-10 text-editorial-bg" />
              </div>
            </div>
            <h1 className="text-6xl font-bold tracking-tight mb-2 italic">Biblioteca</h1>
            {!isCloudEnabled && (
              <div className="mb-6 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                Cloud Non Configurato <br/>
                <span className="opacity-60 text-[9px]">I dati verranno salvati solo in questo browser</span>
              </div>
            )}
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mb-8">
              Catalogazione & Archiviazione Volumi
            </p>
            
            {isCloudEnabled ? (
              <form onSubmit={handleLogin} className="space-y-3 text-left">
                <div className="space-y-1.5">
                  <label className="font-sans text-[9px] uppercase font-black tracking-widest opacity-60">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-editorial-text/10 px-3 py-2.5 font-sans text-sm tracking-wide focus:outline-none focus:border-editorial-text transition-colors"
                    placeholder="esempio@email.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-sans text-[9px] uppercase font-black tracking-widest opacity-60">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-editorial-text/10 px-3 py-2.5 font-sans text-sm tracking-wide focus:outline-none focus:border-editorial-text transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-4 flex items-center justify-center gap-3 bg-editorial-text text-editorial-bg py-3.5 px-6 font-sans text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all active:scale-95 group"
                >
                  <LogIn className="w-4 h-4" />
                  ENTRA
                </button>
              </form>
            ) : (
              <button
                onClick={() => setUseLocalMode(true)}
                className="w-full flex items-center justify-center gap-3 bg-editorial-text text-editorial-bg py-4 px-6 font-sans text-xs font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all active:scale-95 group"
              >
                <BookOpen className="w-5 h-5" />
                INIZIA (MODALITÀ LOCALE)
              </button>
            )}
            
            {loginError && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 bg-red-50 border border-red-100 text-red-900 text-xs italic font-medium"
              >
                {loginError}
              </motion.div>
            )}
          </motion.div>
        </div>
      ) : (
        <div className="flex flex-col h-screen overflow-hidden">
          <header className="flex items-center justify-between px-3 md:px-6 py-3 border-b border-editorial-text/10 bg-editorial-bg z-40">
            <div className="flex items-center">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2.5 md:gap-3 p-1.5 md:p-1 hover:bg-black/5 transition-all rounded-sm group active:scale-[0.98]"
                title={isMenuOpen ? "Nascondi Menu" : "Mostra Menu"}
              >
                <div className="w-8 h-10 md:w-5 md:h-7 bg-editorial-text flex items-center justify-center shadow-sm skew-y-1 shrink-0 transition-transform group-hover:scale-105">
                  <Library className="text-editorial-bg w-4 h-4 md:w-3.5 md:h-3.5" />
                </div>
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <h1 className="text-xl md:text-lg font-black tracking-tighter italic hidden xs:block lg:block whitespace-nowrap">BIBLIOTECA</h1>
                </div>
              </button>
            </div>

            <div className="flex-1 max-w-lg mx-3 md:mx-4 flex items-center gap-2 md:gap-4">
              <div className="relative group flex-1">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4.5 h-4.5 md:w-3.5 md:h-3.5 text-editorial-text opacity-80 group-focus-within:opacity-100 transition-opacity" />
                <input
                  type="text"
                  placeholder="Cerca volume..."
                  className="w-full pl-8 pr-2 py-2.5 md:py-1 bg-transparent text-lg md:text-sm italic focus:outline-none placeholder:text-editorial-text/90"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="hidden sm:flex items-baseline gap-1.5 md:gap-2 font-sans text-[10px] md:text-[9px] font-bold uppercase tracking-widest opacity-80 whitespace-nowrap">
                <span className="text-base md:text-xs text-editorial-text opacity-100 font-black leading-none">{debouncedSearch ? filteredCount : totalCount}</span>
                <span className="leading-none">Volumi</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 md:gap-2">
              <button
                onClick={toggleFontTheme}
                className="p-3 md:p-1.5 border border-editorial-text/10 hover:bg-black/5 transition-all rounded-sm flex items-center gap-1.5"
                title="Cambia carattere"
              >
                <Type size={20} className="md:w-3.5 md:h-3.5" />
                <span className="hidden sm:inline font-sans text-[9px] font-black uppercase tracking-widest">{fontTheme}</span>
              </button>

              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="p-3 md:p-1.5 border border-editorial-text/10 hover:bg-editorial-text hover:text-editorial-bg transition-all rounded-sm"
                title={viewMode === "grid" ? "Lista" : "Griglia"}
              >
                {viewMode === "grid" ? <ListIcon size={20} className="md:w-3.5 md:h-3.5" /> : <Grid size={20} className="md:w-3.5 md:h-3.5" />}
              </button>

              <button
                onClick={handleOpenPrintModal}
                className="hidden md:flex p-3 md:p-1.5 border border-editorial-text/10 hover:bg-black/5 transition-all rounded-sm items-center gap-1.5"
                title="Stampa Registro"
              >
                <Printer size={20} className="md:w-3.5 md:h-3.5" />
                <span className="font-sans text-[9px] font-black uppercase tracking-widest">Stampa</span>
              </button>
              
              {!isMenuOpen && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="p-3 md:p-1.5 bg-editorial-text text-editorial-bg hover:opacity-90 transition-all shadow-sm rounded-sm"
                  title="Nuovo"
                >
                  <Plus size={20} className="md:w-3.5 md:h-3.5" />
                </button>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <Dashboard 
              user={user} 
              isAdmin={!!isAuthorized} 
              search={debouncedSearch} 
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              viewMode={viewMode}
              isFormOpen={isFormOpen}
              setIsFormOpen={setIsFormOpen}
              useLocalMode={useLocalMode}
              onLogout={handleLogout}
              onCountsChange={(total, filtered) => {
                setTotalCount(total);
                setFilteredCount(filtered);
              }}
              onFiltersApplied={(flts, sBy, sOrder) => {
                setActiveFilters(flts);
                setSortBy(sBy);
                setSortOrder(sOrder);
              }}
            />
          </main>

          {/* Print Preview Modal */}
          <AnimatePresence>
            {isPrintModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-editorial-text/40 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", damping: 25, stiffness: 250 }}
                  className="relative w-full max-w-6xl bg-editorial-bg border border-editorial-text/20 shadow-2xl h-[90vh] flex flex-col font-sans text-editorial-text"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-editorial-text/10 p-5 md:px-8 bg-editorial-bg">
                    <div>
                      <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Printer className="w-5 h-5 text-editorial-text" />
                        CONFIGURA E ANTEPRIMA DI STAMPA
                      </h3>
                      <p className="text-xs text-editorial-text/60 font-medium">Seleziona i campi e adatta l'estratto per la stampa o l'esportazione PDF</p>
                    </div>
                    <button
                      onClick={() => setIsPrintModalOpen(false)}
                      className="p-2 hover:bg-neutral-100 transition-colors border border-neutral-200 rounded-sm"
                      title="Chiudi"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-editorial-text/10 bg-editorial-bg">
                    {/* Configuration panel */}
                    <div className="md:w-80 p-6 flex flex-col overflow-y-auto shrink-0 bg-[#faf8f5]">
                      <div className="space-y-6">
                        {/* Orientamento */}
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-editorial-text/80 mb-2">1. Orientamento Pagina</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setOrientation('portrait')}
                              className={`p-2.5 text-xs font-black uppercase tracking-wider border transition-all flex flex-col items-center gap-1.5 ${
                                orientation === 'portrait'
                                  ? 'bg-editorial-text text-editorial-bg border-editorial-text'
                                  : 'bg-white text-editorial-text border-editorial-text/15 hover:bg-neutral-50'
                              }`}
                            >
                              <div className="w-4 h-6 border-2 border-current rounded-[1px] opacity-80 flex items-center justify-center text-[8px] font-sans">A4</div>
                              Verticale
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrientation('landscape')}
                              className={`p-2.5 text-xs font-black uppercase tracking-wider border transition-all flex flex-col items-center gap-1.5 ${
                                orientation === 'landscape'
                                  ? 'bg-editorial-text text-editorial-bg border-editorial-text'
                                  : 'bg-white text-editorial-text border-editorial-text/15 hover:bg-neutral-50'
                              }`}
                            >
                              <div className="w-6 h-4 border-2 border-current rounded-[1px] opacity-80 flex items-center justify-center text-[8px] font-sans">A4</div>
                              Orizzontale
                            </button>
                          </div>
                        </div>

                        {/* Selezione Campi */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-editorial-text/80">2. Campi da stampare</h4>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...selectedFields };
                                  Object.keys(updated).forEach(k => updated[k] = true);
                                  setSelectedFields(updated);
                                }}
                                className="text-[9px] font-black uppercase tracking-widest text-neutral-500 hover:text-editorial-text transition-colors"
                              >
                                Tutti
                              </button>
                              <span className="text-neutral-300">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...selectedFields };
                                  Object.keys(updated).forEach(k => updated[k] = k === 'titolo');
                                  setSelectedFields(updated);
                                }}
                                className="text-[9px] font-black uppercase tracking-widest text-neutral-500 hover:text-editorial-text transition-colors"
                              >
                                Nessuno
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 bg-white p-3 border border-editorial-text/10 rounded-sm max-h-[220px] overflow-y-auto">
                            {Object.entries(fieldLabels).map(([key, label]) => (
                              <label
                                key={key}
                                className={`flex items-center gap-2 p-1.5 rounded-sm hover:bg-neutral-50 cursor-pointer select-none border transition-colors ${
                                  selectedFields[key]
                                    ? 'border-editorial-text/20 bg-neutral-50/10 font-bold'
                                    : 'border-transparent text-editorial-text/65 font-medium'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedFields[key]}
                                  onChange={(e) => {
                                    setSelectedFields(prev => ({
                                      ...prev,
                                      [key]: e.target.checked
                                    }));
                                  }}
                                  className="w-3.5 h-3.5 border-neutral-300 text-editorial-text focus:ring-editorial-text accent-editorial-text"
                                />
                                <span className="text-[11px] truncate">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Info sul filtro corrente */}
                        <div className="p-3 bg-white border border-editorial-text/10 text-[11px] italic text-editorial-text/70 rounded-sm space-y-1">
                          <span className="font-sans font-bold uppercase tracking-wider text-[9px] text-editorial-text/50 block">Filtri di Stampa Attivi:</span>
                          <div>Ricerca: <span className="font-bold text-editorial-text">"{debouncedSearch || 'nessuna'}"</span></div>
                          {activeFilters.autore && <div>Autore: <span className="font-bold text-editorial-text">"{activeFilters.autore}"</span></div>}
                          {activeFilters.genere && <div>Genere: <span className="font-bold text-editorial-text">"{activeFilters.genere}"</span></div>}
                          {activeFilters.editore && <div>Editore: <span className="font-bold text-editorial-text">"{activeFilters.editore}"</span></div>}
                          {activeFilters.collana && <div>Collana: <span className="font-bold text-editorial-text">"{activeFilters.collana}"</span></div>}
                          {activeFilters.scaffale && <div>Scaffale: <span className="font-bold text-editorial-text">"{activeFilters.scaffale}"</span></div>}
                          {activeFilters.nazione && <div>Nazione: <span className="font-bold text-editorial-text">"{activeFilters.nazione}"</span></div>}
                        </div>
                      </div>

                      {/* Azioni finali */}
                      <div className="mt-auto pt-6 border-t border-editorial-text/10 space-y-3">
                        <div className="text-center font-sans">
                          <span className="text-lg font-black text-editorial-text">
                            {loadingPrintBooks ? "..." : printBooks.length}
                          </span>
                          <span className="text-[10px] text-editorial-text/60 uppercase font-bold tracking-wider ml-1">Volumi pronti</span>
                        </div>
                        
                        <button
                          type="button"
                          disabled={loadingPrintBooks || printBooks.length === 0}
                          onClick={handleActualPrint}
                          className="w-full bg-editorial-text text-editorial-bg py-3 px-4 font-sans text-xs font-black uppercase tracking-[0.2em] shadow-md hover:opacity-90 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        >
                          <Printer size={14} />
                          Conferma e Stampa
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPrintModalOpen(false)}
                          className="w-full bg-white text-editorial-text border border-editorial-text/15 py-2 px-3 font-sans text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors text-center cursor-pointer"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>

                    {/* Print preview canvas */}
                    <div className="flex-1 p-6 bg-[#f0ede6] flex flex-col min-w-0">
                      <div className="flex items-center justify-between mb-3 text-xs text-editorial-text/60 uppercase tracking-wider font-bold">
                        <span>Anticipazione Estetica</span>
                        <span>Orientamento: {orientation === 'portrait' ? 'Verticale' : 'Orizzontale'}</span>
                      </div>

                      <div className="flex-1 overflow-auto p-4 border border-editorial-text/10 bg-[#e7e3da] rounded-sm">
                        {loadingPrintBooks ? (
                          <div className="h-full flex flex-col items-center justify-center">
                            <div className="w-8 h-[1.5px] bg-editorial-text animate-pulse mb-2" />
                            <span className="text-[10px] tracking-widest uppercase font-black opacity-60">Compilazione estratto database...</span>
                          </div>
                        ) : printBooks.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-editorial-text/40">
                            <Printer size={32} className="opacity-40 mb-2 animate-bounce" />
                            <span className="text-[10px] tracking-widest uppercase font-black">Nessun libro corrisponde ai filtri</span>
                          </div>
                        ) : (
                          <div className={`bg-white shadow-xl p-8 mx-auto text-black border border-neutral-300 font-serif transition-all duration-300 ${
                            orientation === 'portrait'
                              ? 'w-full max-w-[650px] min-h-[850px]'
                              : 'w-[950px] min-h-[670px] max-w-none'
                          }`}>
                            {/* Print Header */}
                            <div className="border-b-2 border-black pb-4 mb-6">
                              <h1 className="text-xl font-bold uppercase tracking-widest font-serif text-center">Biblioteca di Casa - Registro Volumi</h1>
                              <div className="flex flex-col gap-1.5 mt-4 text-[10px] uppercase font-sans font-bold text-neutral-500">
                                <div className="flex justify-between">
                                  <div>Data: {new Date().toLocaleDateString('it-IT')}</div>
                                  <div>Volumi Estratti: {printBooks.length}</div>
                                </div>
                                <div className="border-t border-neutral-100 pt-1.5 text-[9px] text-neutral-600 font-medium">
                                  Filtri applicati: <span className="text-black font-bold normal-case tracking-normal">{(() => {
                                    const exps: string[] = [];
                                    if (debouncedSearch) exps.push(`Ricerca: "${debouncedSearch}"`);
                                    if (activeFilters.autore) exps.push(`Autore: "${activeFilters.autore}"`);
                                    if (activeFilters.genere) exps.push(`Genere: "${activeFilters.genere}"`);
                                    if (activeFilters.editore) exps.push(`Editore: "${activeFilters.editore}"`);
                                    if (activeFilters.collana) exps.push(`Collana: "${activeFilters.collana}"`);
                                    if (activeFilters.scaffale) exps.push(`Scaffale: "${activeFilters.scaffale}"`);
                                    if (activeFilters.nazione) exps.push(`Nazione: "${activeFilters.nazione}"`);
                                    return exps.length > 0 ? exps.join(" | ") : "Nessuno (Tutti i volumi)";
                                  })()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Print Table */}
                            <table className="w-full text-left font-sans text-xs border-collapse">
                              <thead>
                                <tr className="border-b-2 border-black text-[9px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-800">
                                  {Object.entries(selectedFields)
                                    .filter(([_, enabled]) => enabled)
                                    .map(([key]) => (
                                      <th key={key} className="py-2 px-1.5 font-bold">
                                        {fieldLabels[key as keyof typeof fieldLabels]}
                                      </th>
                                    ))}
                                </tr>
                              </thead>
                              <tbody>
                                {printBooks.slice(0, 30).map((book, idx) => (
                                  <tr key={book.id || idx} className="border-b border-neutral-150 text-[10px] hover:bg-neutral-50/60 font-medium">
                                    {Object.entries(selectedFields)
                                      .filter(([_, enabled]) => enabled)
                                      .map(([key]) => {
                                        let value = (book as any)[key];
                                        if (key === 'diProprieta') {
                                          value = value ? 'Sì' : 'No';
                                        } else if (key === 'inPrestito') {
                                          value = value ? `Sì (${book.prestitoA || ''})` : 'No';
                                        } else if (key === 'isLinguaOriginale') {
                                          value = value ? 'Sì' : 'No';
                                        } else if (key === 'isRomanzo') {
                                          value = value ? 'Sì' : 'No';
                                        }

                                        return (
                                          <td key={key} className="py-1.5 px-1.5 truncate max-w-[140px] text-neutral-700">
                                            {value !== null && value !== undefined && value !== "" ? String(value) : "-"}
                                          </td>
                                        );
                                      })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            
                            {printBooks.length > 30 && (
                              <div className="mt-4 p-2 bg-neutral-50 border border-neutral-200 text-[10px] text-center font-sans italic text-neutral-500">
                                Estrazione limitata a 30 righe nell'anteprima digitale su schermo... Tutti i {printBooks.length} record verranno stampati sul cartaceo.
                              </div>
                            )}

                            {/* Print Footer */}
                            <div className="mt-8 border-t border-neutral-200 pt-4 text-[9px] text-neutral-400 font-sans tracking-wide text-center uppercase">
                              Documento ufficiale biblioteca - Generato tramite software di catalogazione interna.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
