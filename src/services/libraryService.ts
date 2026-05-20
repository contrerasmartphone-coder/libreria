import { Book } from "../types";
import { supabase, isConfigured } from "../lib/supabase";

const isCloudEnabled = isConfigured;

const LOCAL_STORAGE_KEYS = {
  BOOKS: 'biblioteca_books'
};

const getLocalData = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  try {
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const libraryService = {
  isCloudEnabled,
  cloudProvider: 'supabase',

  // Helper to ensure user is authenticated for cloud operations
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Errore Supabase auth.getUser():", error);
        return null;
      }
      if (user) {
        console.log("Utente Supabase verificato:", user.id, user.email);
      } else {
        console.warn("Nessun utente Supabase trovato nella sessione.");
      }
      return user;
    } catch (e) {
      console.error("Eccezione durante getCurrentUser:", e);
      return null;
    }
  },

  // Database mappers
  mapBookToDb(book: Partial<Book>) {
    const dbRow: any = {};
    
    // Campi con mapping diretto (camelCase)
    const fields = [
      'anno', 'autore', 'codice', 'collana', 'commento', 'diProprieta', 'editore', 
      'edizione', 'formato', 'genere', 'inPrestito', 'isLinguaOriginale', 
      'isRomanzo', 'nazione', 'pagine', 'prestitoA', 'prestitoDal', 'proprietaDal', 
      'proprietaDi', 'riassunto', 'scaffale', 'titolo', 'titoloOriginale', 'traduttore'
    ];
    
    fields.forEach(f => {
      if ((book as any)[f] !== undefined) {
        const val = (book as any)[f];
        // Don't send empty strings for numeric IDs or if we want DB to auto-generate
        if (f === 'codice' && val === "") {
          return;
        }
        dbRow[f] = val === "" ? null : val;
      }
    });

    // Campi metadata fissi
    if (book.ownerId !== undefined) dbRow.owner_id = book.ownerId;
    if (book.createdAt !== undefined) dbRow.created_at = book.createdAt === "" ? null : book.createdAt;
    if (book.updatedAt !== undefined) dbRow.updated_at = book.updatedAt === "" ? null : book.updatedAt;

    return dbRow;
  },

  mapDbToBook(row: any): Book {
    return {
      ...row,
      id: row.codice, // We use codice as the frontend ID
      ownerId: row.owner_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  // Books
  async addBook(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>): Promise<string> {
    if (this.isCloudEnabled) {
      const user = await this.getCurrentUser();
      if (!user) throw new Error("Utente non autenticato. Effettua nuovamente il login.");

      // Verifica duplicato codice PRIMA del salvataggio
      const { data: existingBook } = await supabase
        .from('books')
        .select('titolo')
        .eq('codice', book.codice)
        .maybeSingle();

      if (existingBook) {
        throw new Error(`Il codice ${book.codice} è già assegnato al volume: "${existingBook.titolo}"`);
      }

      const now = new Date().toISOString();
      let codiceToUse = book.codice;

      // Se il codice non è fornito, cerchiamo di trovarne uno libero (fallback di sicurezza)
      if (!codiceToUse || codiceToUse === "") {
        codiceToUse = (await this.getNextAvailableCode()).toString();
      }

      const insertData = this.mapBookToDb({
        ...book,
        codice: codiceToUse,
        ownerId: user.id,
        createdAt: now,
        updatedAt: now
      });

      console.log("Tentativo di inserimento libro:", insertData);

      const { data, error } = await supabase
        .from('books')
        .insert([insertData])
        .select();
      
      if (error) {
        console.error("Errore critico salvataggio libro Supabase:", error);
        // If we still get a duplicate key, suggest a manual code or report the error
        throw new Error(`Errore database: ${error.message}${error.details ? ' - ' + error.details : ''} (Codice: ${error.code})`);
      }
      
      if (!data || data.length === 0) {
        return insertData.codice;
      }
      
      return data[0].codice;
    }

    const books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    
    // Verifica duplicato codice PRIMA del salvataggio locale
    const duplicate = books.find(b => b.codice === book.codice);
    if (duplicate) {
      throw new Error(`Il codice ${book.codice} è già assegnato al volume: "${duplicate.titolo}"`);
    }

    const newBook: Book = {
      ...book,
      id: crypto.randomUUID(),
      ownerId: 'local-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Book;
    books.push(newBook);
    saveLocalData(LOCAL_STORAGE_KEYS.BOOKS, books);
    return newBook.id!;
  },

  async updateBook(id: string, updates: Partial<Book>): Promise<void> {
    if (this.isCloudEnabled) {
      if (updates.codice) {
        // Verifica duplicato codice se è stato modificato
        const { data: existingBook } = await supabase
          .from('books')
          .select('codice, titolo')
          .eq('codice', updates.codice)
          .maybeSingle();

        if (existingBook && String(existingBook.codice) !== String(id)) {
          throw new Error(`Il codice ${updates.codice} è già assegnato al volume: "${existingBook.titolo}"`);
        }
      }

      const dbUpdates = this.mapBookToDb({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      // Match by codice exclusively
      const { error: updateError } = await supabase
        .from('books')
        .update(dbUpdates)
        .eq('codice', id); 
      
      if (updateError) {
        console.error("Errore aggiornamento libro Cloud:", updateError);
        throw updateError;
      }
      return;
    }

    const books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);

    if (updates.codice) {
      // Verifica duplicato codice se è stato modificato (locale)
      const duplicate = books.find(b => b.codice === updates.codice && b.id !== id);
      if (duplicate) {
        throw new Error(`Il codice ${updates.codice} è già assegnato al volume: "${duplicate.titolo}"`);
      }
    }

    const index = books.findIndex(b => b.id === id);
    if (index !== -1) {
      books[index] = { 
        ...books[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      saveLocalData(LOCAL_STORAGE_KEYS.BOOKS, books);
    }
  },

  async deleteBook(id: string): Promise<void> {
    if (this.isCloudEnabled) {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('codice', id);
      
      if (error) throw error;
      return;
    }

    const books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    saveLocalData(LOCAL_STORAGE_KEYS.BOOKS, books.filter(b => b.id !== id));
  },

  async getBooks(): Promise<Book[]> {
    if (this.isCloudEnabled) {
      const user = await this.getCurrentUser();
      console.log("Richiesta di tutti i libri. Stato utente:", user ? "Autenticato (" + user.id + ")" : "Non Autenticato");
      
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Errore recupero tutti i libri Cloud:", error);
        throw new Error(`Errore lettura libri: ${error.message}`);
      }
      
      console.log(`Risposta Supabase: ricevuti ${data?.length || 0} libri.`);
      // Map snake_case to camelCase
      return (data || []).map(b => this.mapDbToBook(b));
    }
    return getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
  },

  async getBooksPaginated(
    pageSize: number, 
    page: number = 0, 
    searchTerm?: string,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    filters: { autore?: string; genere?: string; editore?: string; collana?: string; scaffale?: string; nazione?: string } = {}
  ): Promise<{ books: Book[], total: number }> {
    if (this.isCloudEnabled) {
      const user = await this.getCurrentUser();
      console.log(`Richiesta paginata libri. Pagina: ${page}, Filtro: ${searchTerm || "nessuno"}, Sort: ${sortBy} ${sortOrder}, Utente: ${user?.id}`);

      let query = supabase
        .from('books')
        .select('*', { count: 'exact' });
      
      if (searchTerm && searchTerm.trim() !== "") {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`titolo.ilike.${term},autore.ilike.${term},codice.ilike.${term}`);
      }

      // Add specific filters
      if (filters.autore) query = query.ilike('autore', `%${filters.autore}%`);
      if (filters.genere) query = query.ilike('genere', `%${filters.genere}%`);
      if (filters.editore) query = query.ilike('editore', `%${filters.editore}%`);
      if (filters.collana) query = query.ilike('collana', `%${filters.collana}%`);
      if (filters.scaffale) query = query.ilike('scaffale', `%${filters.scaffale}%`);
      if (filters.nazione) query = query.ilike('nazione', `%${filters.nazione}%`);

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);
      
      if (error) {
        console.error("Errore recupero libri paginati Cloud:", error);
        throw new Error(`Errore lettura paginata: ${error.message}`);
      }

      return { 
        books: (data || []).map(b => this.mapDbToBook(b)), 
        total: count || 0 
      };
    }

    let books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    
    // Search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      books = books.filter(b => 
        b.titolo?.toLowerCase().includes(term) || 
        b.autore?.toLowerCase().includes(term) || 
        b.codice?.toLowerCase().includes(term)
      );
    }

    // Specific filters
    if (filters.autore) books = books.filter(b => b.autore?.toLowerCase().includes(filters.autore!.toLowerCase()));
    if (filters.genere) books = books.filter(b => b.genere?.toLowerCase().includes(filters.genere!.toLowerCase()));
    if (filters.editore) books = books.filter(b => b.editore?.toLowerCase().includes(filters.editore!.toLowerCase()));
    if (filters.collana) books = books.filter(b => b.collana?.toLowerCase().includes(filters.collana!.toLowerCase()));
    if (filters.scaffale) books = books.filter(b => b.scaffale?.toLowerCase().includes(filters.scaffale!.toLowerCase()));
    if (filters.nazione) books = books.filter(b => b.nazione?.toLowerCase().includes(filters.nazione!.toLowerCase()));

    // Sorting
    books.sort((a, b) => {
      const valA = (a as any)[sortBy] || "";
      const valB = (b as any)[sortBy] || "";
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    const total = books.length;
    const from = page * pageSize;
    const to = from + pageSize;
    const paginatedBooks = books.slice(from, to);
    
    return { books: paginatedBooks, total };
  },

  async getAllFilteredBooks(
    searchTerm?: string,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    filters: { autore?: string; genere?: string; editore?: string; collana?: string; scaffale?: string; nazione?: string } = {}
  ): Promise<Book[]> {
    if (this.isCloudEnabled) {
      let query = supabase.from('books').select('*');
      
      if (searchTerm && searchTerm.trim() !== "") {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`titolo.ilike.${term},autore.ilike.${term},codice.ilike.${term}`);
      }

      // Add specific filters
      if (filters.autore) query = query.ilike('autore', `%${filters.autore}%`);
      if (filters.genere) query = query.ilike('genere', `%${filters.genere}%`);
      if (filters.editore) query = query.ilike('editore', `%${filters.editore}%`);
      if (filters.collana) query = query.ilike('collana', `%${filters.collana}%`);
      if (filters.scaffale) query = query.ilike('scaffale', `%${filters.scaffale}%`);
      if (filters.nazione) query = query.ilike('nazione', `%${filters.nazione}%`);

      const { data, error } = await query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(0, 10000); // Fetch all filtered items up to a high limit
      
      if (error) {
        console.error("Errore recupero tutti i libri filtrati Cloud:", error);
        throw new Error(`Errore lettura libri: ${error.message}`);
      }

      return (data || []).map(b => this.mapDbToBook(b));
    }

    let books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    
    // Search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      books = books.filter(b => 
        b.titolo?.toLowerCase().includes(term) || 
        b.autore?.toLowerCase().includes(term) || 
        b.codice?.toLowerCase().includes(term)
      );
    }

    // Specific filters
    if (filters.autore) books = books.filter(b => b.autore?.toLowerCase().includes(filters.autore!.toLowerCase()));
    if (filters.genere) books = books.filter(b => b.genere?.toLowerCase().includes(filters.genere!.toLowerCase()));
    if (filters.editore) books = books.filter(b => b.editore?.toLowerCase().includes(filters.editore!.toLowerCase()));
    if (filters.collana) books = books.filter(b => b.collana?.toLowerCase().includes(filters.collana!.toLowerCase()));
    if (filters.scaffale) books = books.filter(b => b.scaffale?.toLowerCase().includes(filters.scaffale!.toLowerCase()));
    if (filters.nazione) books = books.filter(b => b.nazione?.toLowerCase().includes(filters.nazione!.toLowerCase()));

    // Sorting
    books.sort((a, b) => {
      const valA = (a as any)[sortBy] || "";
      const valB = (b as any)[sortBy] || "";
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return books;
  },

  async getFilterOptions(): Promise<{ autores: string[], generes: string[], editores: string[], collanas: string[], naziones: string[], scaffales: string[] }> {
    if (this.isCloudEnabled) {
      // Fetch each field separately to get more unique values across the entire database
      const fields = ['autore', 'genere', 'editore', 'collana', 'nazione', 'scaffale'];
      const results = await Promise.all(
        fields.map(field => 
          supabase
            .from('books')
            .select(field)
            .not(field, 'is', null)
            .order(field)
            .range(0, 3000)
        )
      );
      
      const [autoresData, generesData, editoresData, collanasData, nazionesData, scaffalesData] = results;
      
      const extractUnique = (res: any, field: string) => 
        Array.from(new Set((res.data || []).map((i: any) => i[field]).filter(Boolean))) as string[];

      return { 
        autores: extractUnique(autoresData, 'autore').sort(), 
        generes: extractUnique(generesData, 'genere').sort(), 
        editores: extractUnique(editoresData, 'editore').sort(),
        collanas: extractUnique(collanasData, 'collana').sort(),
        naziones: extractUnique(nazionesData, 'nazione').sort(),
        scaffales: extractUnique(scaffalesData, 'scaffale').sort()
      };
    }
    
    const books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    const autores = Array.from(new Set(books.map(i => i.autore).filter(Boolean))) as string[];
    const generes = Array.from(new Set(books.map(i => i.genere).filter(Boolean))) as string[];
    const editores = Array.from(new Set(books.map(i => i.editore).filter(Boolean))) as string[];
    const collanas = Array.from(new Set(books.map(i => i.collana).filter(Boolean))) as string[];
    const naziones = Array.from(new Set(books.map(i => i.nazione).filter(Boolean))) as string[];
    const scaffales = Array.from(new Set(books.map(i => i.scaffale).filter(Boolean))) as string[];
    
    return { 
      autores: autores.sort(), 
      generes: generes.sort(), 
      editores: editores.sort(),
      collanas: collanas.sort(),
      naziones: naziones.sort(),
      scaffales: scaffales.sort()
    };
  },

  async getTotalCount(): Promise<number> {
    if (this.isCloudEnabled) {
      const { count, error } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error("Errore recupero conteggio totale:", error);
        return 0;
      }
      return count || 0;
    }
    return getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS).length;
  },

  async batchImportBooks(books: any[]): Promise<void> {
    const existingBooks = await this.getBooks();
    const existingCodes = new Map(existingBooks.map(b => [b.codice, b.titolo]));

    for (const book of books) {
      if (book.codice && existingCodes.has(book.codice)) {
        throw new Error(`Importazione fallita: il codice ${book.codice} è già assegnato al volume: "${existingCodes.get(book.codice)}"`);
      }
    }

    if (this.isCloudEnabled) {
      const user = await this.getCurrentUser();
      if (!user) throw new Error("Utente non autenticato. Impossibile importare sul cloud.");

      const now = new Date().toISOString();
      const sanitized = books.map(book => {
        const bookWithMeta = {
          ...book,
          ownerId: user.id,
          createdAt: now,
          updatedAt: now
        };
        return this.mapBookToDb(bookWithMeta);
      });

      // Chunk the import to prevent timeout or payload size limits (Supabase/PostgREST limits)
      const chunkSize = 50;
      for (let i = 0; i < sanitized.length; i += chunkSize) {
        const chunk = sanitized.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('books')
          .insert(chunk);
        
        if (error) {
          console.error("Batch insert error at chunk", i, error);
          throw error;
        }
      }
      return;
    }

    const nowLocal = new Date().toISOString();
    const newBooks = books.map(book => ({
      ...book,
      id: crypto.randomUUID(),
      ownerId: 'local-user',
      createdAt: nowLocal,
      updatedAt: nowLocal,
    }));
    saveLocalData(LOCAL_STORAGE_KEYS.BOOKS, [...existingBooks, ...newBooks]);
  },

  async getNextAvailableCode(): Promise<string> {
    let books: Book[] = [];
    if (this.isCloudEnabled) {
      const { data, error } = await supabase
        .from('books')
        .select('codice');
      if (error) {
        console.error("Errore recupero codici per auto-incremento:", error);
        return "10000";
      }
      books = (data || []).map(b => this.mapDbToBook(b));
    } else {
      books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    }

    const numericCodes = books
      .map(b => parseInt(b.codice))
      .filter(n => !isNaN(n));

    const baseCode = 10000;
    if (numericCodes.length === 0) return baseCode.toString();

    const maxCode = Math.max(...numericCodes);
    const nextCode = Math.max(baseCode, maxCode + 1);
    return nextCode.toString();
  },

  async searchFieldSuggestions(field: string, searchTerm: string): Promise<string[]> {
    if (this.isCloudEnabled) {
      const { data, error } = await supabase
        .from('books')
        .select(field)
        .ilike(field, `%${searchTerm}%`)
        .order(field)
        .range(0, 5000); // Fetch a larger range to get more unique values
      
      if (error) return [];
      return Array.from(new Set(data.map(i => (i as any)[field]).filter(Boolean))) as string[];
    }

    const books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    const results = Array.from(new Set(books.map(i => (i as any)[field]).filter(Boolean))) as string[];
    return results.filter(val => val.toLowerCase().includes(searchTerm.toLowerCase())).sort();
  },

  async bulkUpdateBooks(
    filters: { autore?: string; genere?: string; editore?: string; collana?: string; scaffale?: string; nazione?: string },
    searchTerm: string,
    field: string,
    value: any
  ): Promise<number> {
    if (this.isCloudEnabled) {
      const dbUpdates = this.mapBookToDb({ [field]: value });
      dbUpdates.updated_at = new Date().toISOString();

      let query = supabase.from('books').update(dbUpdates);
      
      // Apply filters
      if (searchTerm && searchTerm.trim() !== "") {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(`titolo.ilike.${term},autore.ilike.${term},codice.ilike.${term}`);
      }
      if (filters.autore) query = query.ilike('autore', `%${filters.autore}%`);
      if (filters.genere) query = query.ilike('genere', `%${filters.genere}%`);
      if (filters.editore) query = query.ilike('editore', `%${filters.editore}%`);
      if (filters.collana) query = query.ilike('collana', `%${filters.collana}%`);
      if (filters.scaffale) query = query.ilike('scaffale', `%${filters.scaffale}%`);
      if (filters.nazione) query = query.ilike('nazione', `%${filters.nazione}%`);

      const { data, error } = await query.select('codice');
      if (error) throw error;
      return data ? data.length : 0;
    }

    // Local implementation
    let books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    
    // Apply search filter
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      books = books.filter(b => 
        b.titolo?.toLowerCase().includes(term) || 
        b.autore?.toLowerCase().includes(term) || 
        b.codice?.toLowerCase().includes(term)
      );
    }

    // Apply specific filters
    if (filters.autore) books = books.filter(b => b.autore?.toLowerCase().includes(filters.autore!.toLowerCase()));
    if (filters.genere) books = books.filter(b => b.genere?.toLowerCase().includes(filters.genere!.toLowerCase()));
    if (filters.editore) books = books.filter(b => b.editore?.toLowerCase().includes(filters.editore!.toLowerCase()));
    if (filters.collana) books = books.filter(b => b.collana?.toLowerCase().includes(filters.collana!.toLowerCase()));
    if (filters.scaffale) books = books.filter(b => b.scaffale?.toLowerCase().includes(filters.scaffale!.toLowerCase()));
    if (filters.nazione) books = books.filter(b => b.nazione?.toLowerCase().includes(filters.nazione!.toLowerCase()));

    const idsToUpdate = new Set(books.map(b => b.id));
    const allBooks = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    const updatedBooks = allBooks.map(b => {
      if (idsToUpdate.has(b.id)) {
        return { ...b, [field]: value, updatedAt: new Date().toISOString() };
      }
      return b;
    });

    saveLocalData(LOCAL_STORAGE_KEYS.BOOKS, updatedBooks);
    return idsToUpdate.size;
  },

  setupRealtimeSubscription(onUpdate: () => void) {
    if (!this.isCloudEnabled) return () => {};

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'books'
        },
        (payload) => {
          console.log('Real-time change received:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
