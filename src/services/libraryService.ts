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
      id: row.id || row.codice, // Fallback to codice if id column is missing from schema
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

      const now = new Date().toISOString();
      const insertData = this.mapBookToDb({
        ...book,
        id: crypto.randomUUID(),
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
        throw new Error(`Errore database: ${error.message}${error.details ? ' - ' + error.details : ''} (Codice: ${error.code})`);
      }
      
      if (!data || data.length === 0) {
        console.warn("Dati non restituiti dopo insert (possibile RLS). Restituisco l'ID generato.");
        return insertData.id;
      }
      
      console.log("Libro salvato con successo. ID:", data[0].id);
      return data[0].id;
    }

    const books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
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
      const dbUpdates = this.mapBookToDb({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      const { error } = await supabase
        .from('books')
        .update(dbUpdates)
        .eq('codice', id); // Use codice since id column is missing
      
      if (error) {
        console.error("Errore aggiornamento libro Cloud:", error);
        throw error;
      }
      return;
    }

    const books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
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
        .eq('codice', id); // Use codice since id column is missing
      
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
    filters: { autore?: string; genere?: string; editore?: string } = {}
  ): Promise<{ books: Book[], total: number }> {
    if (this.isCloudEnabled) {
      const user = await this.getCurrentUser();
      console.log(`Richiesta paginata libri. Pagina: ${page}, Filtro: ${searchTerm || "nessuno"}, Sort: ${sortBy} ${sortOrder}, Utente: ${user?.id}`);

      let query = supabase
        .from('books')
        .select('*', { count: 'exact' });
      
      if (searchTerm && searchTerm.trim() !== "") {
        query = query.ilike('titolo', `%${searchTerm.trim()}%`);
      }

      // Add specific filters
      if (filters.autore) query = query.eq('autore', filters.autore);
      if (filters.genere) query = query.eq('genere', filters.genere);
      if (filters.editore) query = query.eq('editore', filters.editore);

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
      books = books.filter(b => b.titolo?.toLowerCase().includes(term));
    }

    // Specific filters
    if (filters.autore) books = books.filter(b => b.autore === filters.autore);
    if (filters.genere) books = books.filter(b => b.genere === filters.genere);
    if (filters.editore) books = books.filter(b => b.editore === filters.editore);

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

  async getFilterOptions(): Promise<{ autores: string[], generes: string[], editores: string[] }> {
    if (this.isCloudEnabled) {
      const { data, error } = await supabase
        .from('books')
        .select('autore, genere, editore');
      
      if (error) return { autores: [], generes: [], editores: [] };
      
      const autores = Array.from(new Set(data.map(i => i.autore).filter(Boolean))) as string[];
      const generes = Array.from(new Set(data.map(i => i.genere).filter(Boolean))) as string[];
      const editores = Array.from(new Set(data.map(i => i.editore).filter(Boolean))) as string[];
      
      return { 
        autores: autores.sort(), 
        generes: generes.sort(), 
        editores: editores.sort() 
      };
    }
    
    const books = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    const autores = Array.from(new Set(books.map(i => i.autore).filter(Boolean))) as string[];
    const generes = Array.from(new Set(books.map(i => i.genere).filter(Boolean))) as string[];
    const editores = Array.from(new Set(books.map(i => i.editore).filter(Boolean))) as string[];
    
    return { 
      autores: autores.sort(), 
      generes: generes.sort(), 
      editores: editores.sort() 
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

    const existingBooks = getLocalData<Book>(LOCAL_STORAGE_KEYS.BOOKS);
    const nowLocal = new Date().toISOString();
    const newBooks = books.map(book => ({
      ...book,
      id: crypto.randomUUID(),
      ownerId: 'local-user',
      createdAt: nowLocal,
      updatedAt: nowLocal,
    }));
    saveLocalData(LOCAL_STORAGE_KEYS.BOOKS, [...existingBooks, ...newBooks]);
  }
};
