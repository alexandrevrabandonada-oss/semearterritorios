import { isSafePublicWord } from "@/lib/public-transparency-word-safety";

type WordItem = { word?: string; count?: number };

type WordsProps = {
  words: WordItem[];
};

export function PublicTransparencyWords({ words }: WordsProps) {
  const safeWords = words.filter((item) => isSafePublicWord(item.word ?? ""));

  return (
    <section className="rounded-[1.5rem] border border-semear-green/10 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-semear-green">Palavras recorrentes</h2>
      {safeWords.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">Palavras públicas ainda não disponíveis para este recorte.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {safeWords.slice(0, 30).map((item, index) => (
            <span className="rounded-full border border-semear-yellow/50 bg-semear-offwhite px-3 py-1 text-sm font-semibold text-semear-green" key={`${item.word ?? "palavra"}-${index}`}>
              {item.word} {item.count ? `(${item.count})` : ""}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
