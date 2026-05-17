import { Book } from "../types";
import { Edit2, Trash2, User, BookOpen, MapPin, Calendar, ExternalLink, Bookmark } from "lucide-react";
import { motion } from "motion/react";
import { cn, formatDate } from "../lib/utils";

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (id: string | undefined) => Promise<void>;
  viewMode: "grid" | "list";
}

export default function BookCard({ book, onEdit, onDelete, viewMode }: BookCardProps) {
  const isGrid = viewMode === "grid";

  if (!isGrid) {
    return (
      <div 
        className="group flex gap-3 border-b border-editorial-text/5 pb-3 hover:bg-black/5 px-2 -mx-2 transition-colors font-serif cursor-pointer items-center min-h-[5rem]"
        onClick={() => onEdit(book)}
      >
        <div className="w-12 h-16 md:w-14 md:h-20 bg-[#DEDCD5] shadow-sm shrink-0 flex items-center justify-center p-1 border border-editorial-text/5 transform transition-transform group-hover:-rotate-1">
          <BookOpen size={20} className="opacity-10" />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
            <h4 className="text-lg md:text-base font-black leading-tight tracking-tight">{book.titolo}</h4>
            <p className="text-sm md:text-sm italic font-black text-editorial-text">— {book.autore || "Autore Ignoto"}</p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 md:gap-4">
            <span className="font-sans text-[11px] md:text-[10px] uppercase tracking-tight font-black opacity-80">
              {book.codice || "BN-0000"}
            </span>
            <span className={cn(
              "text-[10px] md:text-[9px] font-sans font-black px-2.5 py-0.5 uppercase tracking-wider rounded-xs",
              book.inPrestito ? "bg-red-50 text-red-900 border border-red-200" : "bg-green-50 text-green-900 border border-green-200"
            )}>
              {book.inPrestito ? "In Prestito" : "Disponibile"}
            </span>
            <span className="text-[11px] md:text-[10px] font-sans opacity-70 italic font-bold">{book.scaffale ? `Scaffale ${book.scaffale}` : "Archivio"}</span>
            

          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full group font-serif cursor-pointer active:scale-[0.98] lg:active:scale-100 transition-transform" 
      onClick={() => onEdit(book)}
    >
      <div className={cn(
        "aspect-[3/4] w-[70%] md:w-[65%] lg:w-[80%] mx-auto mb-4 md:mb-6 shadow-xl md:shadow-2xl flex items-center justify-center p-4 md:p-6 text-center border border-editorial-text/5 relative overflow-hidden transition-all duration-500 group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] lg:group-hover:-translate-y-2 shrink-0",
        book.inPrestito ? "bg-[#212121]" : "bg-[#DEDCD5]"
      )}>
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-2 md:top-4 left-2 md:left-4 border-l border-t border-editorial-text w-4 md:h-8 h-4 md:w-8 opacity-20" />
          <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 border-r border-b border-editorial-text w-4 md:h-8 h-4 md:w-8 opacity-20" />
        </div>
        <div className="z-10">
          <span className={cn(
            "text-[10px] md:text-xs font-sans uppercase tracking-[0.2em] md:tracking-[0.3em] font-black opacity-60 block mb-4 md:mb-8 px-2 md:px-4",
            book.inPrestito ? "text-white" : "text-editorial-text"
          )}>
            {book.genere || "Volume"}
          </span>
          <BookOpen className={cn("w-8 h-8 md:w-14 md:h-14 mx-auto mb-2 md:mb-4 opacity-20", book.inPrestito ? "text-white" : "text-editorial-text")} />
        </div>


      </div>

      <div className="flex flex-col flex-1 text-center md:text-left mt-2">
        <span className="font-sans text-[10px] md:text-xs uppercase tracking-[0.1em] font-black opacity-90 mb-1">
          {book.codice || "BN-0000"}
        </span>
        <h4 className="text-base md:text-xl lg:text-2xl font-black leading-tight mb-1 tracking-tight lg:group-hover:underline underline-offset-4 md:underline-offset-8 decoration-1 md:decoration-2">
          {book.titolo}
        </h4>
        <p className="text-sm md:text-base italic font-black mb-3 md:mb-4 text-editorial-text">{book.autore || "Autore Ignoto"}</p>
        
        <div className="flex flex-col gap-2 md:gap-3 border-t border-editorial-text/10 pt-3 md:pt-4 mt-auto">
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-[10px] md:text-xs font-sans font-black uppercase tracking-wider px-2 md:px-3 py-1 md:py-1 rounded-sm",
              book.inPrestito 
                ? "bg-red-50 text-red-900 border border-red-100" 
                : "bg-green-50 text-green-900 border border-green-100"
            )}>
              {book.inPrestito ? "In Prestito" : "Disponibile"}
            </span>
            <span className="text-[11px] md:text-sm font-sans opacity-100 italic font-black ml-2">{book.scaffale || "Archivio"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
