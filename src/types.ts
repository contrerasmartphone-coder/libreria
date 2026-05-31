export interface Racconto {
  id: string;
  titolo: string;
  autore: string;
}

export interface Book {
  id?: string;
  codice: string;
  titolo: string;
  autore: string;
  genere: string;
  editore: string;
  edizione: string;
  collana: string;
  formato: string;
  pagine: number;
  anno: number;
  nazione: string;
  scaffale: string;
  riassunto: string;
  commento: string;
  isRomanzo: boolean;
  isLinguaOriginale: boolean;
  traduttore: string;
  titoloOriginale: string;
  inPrestito: boolean;
  prestitoDal?: string; // ISO string
  prestitoA: string;
  diProprieta: boolean;
  proprietaDal?: string; // ISO string
  proprietaDi: string;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
  racconti?: Racconto[];
}
