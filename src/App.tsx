/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import Dashboard from "./components/Dashboard";
import { BookOpen, LogIn, LogOut, Library, ShieldAlert, Search, Menu, ChevronLeft, Grid, List as ListIcon, Plus } from "lucide-react";
import { motion } from "motion/react";
import { libraryService } from "./services/libraryService";
import { supabase } from "./lib/supabase";

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [useLocalMode, setUseLocalMode] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const isCloudEnabled = libraryService.isCloudEnabled;

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
    <div className="min-h-screen bg-editorial-bg text-editorial-text font-serif selection:bg-editorial-text selection:text-white">
      {!user && !useLocalMode ? (
        <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <div className="mb-12 flex justify-center">
              <div className="w-24 h-32 bg-editorial-text flex items-center justify-center shadow-2xl skew-y-3">
                <Library className="w-12 h-12 text-editorial-bg" />
              </div>
            </div>
            <h1 className="text-8xl font-bold tracking-tight mb-4 italic">Biblioteca</h1>
            {!isCloudEnabled && (
              <div className="mb-8 px-6 py-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-widest leading-relaxed">
                Cloud Non Configurato <br/>
                <span className="opacity-60 text-[10px]">I dati verranno salvati solo in questo browser</span>
              </div>
            )}
            <p className="font-sans text-xs uppercase tracking-[0.2em] font-bold opacity-70 mb-14">
              Catalogazione & Archiviazione Volumi
            </p>
            
            {isCloudEnabled ? (
              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="font-sans text-[10px] uppercase font-black tracking-widest opacity-60">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-editorial-text/10 px-4 py-4 font-sans text-sm tracking-wide focus:outline-none focus:border-editorial-text transition-colors"
                    placeholder="esempio@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-sans text-[10px] uppercase font-black tracking-widest opacity-60">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-editorial-text/10 px-4 py-4 font-sans text-sm tracking-wide focus:outline-none focus:border-editorial-text transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-6 flex items-center justify-center gap-3 bg-editorial-text text-editorial-bg py-5 px-8 font-sans text-xs font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all active:scale-95 group"
                >
                  <LogIn className="w-4 h-4" />
                  ACCEDI AL SISTEMA
                </button>
              </form>
            ) : (
              <button
                onClick={() => setUseLocalMode(true)}
                className="w-full flex items-center justify-center gap-3 bg-editorial-text text-editorial-bg py-6 px-8 font-sans text-sm font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all active:scale-95 group"
              >
                <BookOpen className="w-5 h-5" />
                INIZIA (MODALITÀ LOCALE)
              </button>
            )}
            
            {loginError && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 p-4 bg-red-50 border border-red-100 text-red-900 text-sm italic font-medium"
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
                <div className="w-7 h-9 md:w-5 md:h-7 bg-editorial-text flex items-center justify-center shadow-sm skew-y-1 shrink-0 transition-transform group-hover:scale-105">
                  <Library size={14} className="text-editorial-bg" />
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
                  className="w-full pl-8 pr-2 py-2.5 md:py-1 bg-transparent text-lg md:text-sm font-serif italic focus:outline-none placeholder:text-editorial-text/90"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="hidden sm:flex items-baseline gap-1.5 md:gap-2 font-sans text-[10px] md:text-[9px] font-bold uppercase tracking-widest opacity-80 whitespace-nowrap">
                <span className="text-base md:text-xs text-editorial-text opacity-100 font-black leading-none">{search ? filteredCount : totalCount}</span>
                <span className="leading-none">Volumi</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 md:gap-2">
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="p-3 md:p-1.5 border border-editorial-text/10 hover:bg-editorial-text hover:text-editorial-bg transition-all rounded-sm"
                title={viewMode === "grid" ? "Lista" : "Griglia"}
              >
                {viewMode === "grid" ? <ListIcon size={20} className="md:w-3.5 md:h-3.5" /> : <Grid size={20} className="md:w-3.5 md:h-3.5" />}
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
              search={search} 
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
            />
          </main>
        </div>
      )}
    </div>
  );
}
