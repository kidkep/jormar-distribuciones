export const GARMENT_LABELS: Record<string, string> = {
  camiseta: "Camiseta",
  camisa: "Camisa",
  polo: "Polo",
  blusa: "Blusa",
  buso: "Buso",
  sudadera: "Sudadera",
  chaqueta: "Chaqueta",
  chaleco: "Chaleco",
  overol: "Overol",
  pantalon: "Pantalón",
  jean: "Jean",
  bermuda: "Bermuda",
  calzado: "Calzado",
  casco: "Casco",
  gorra: "Gorra",
  gafas: "Gafas",
  guante: "Guantes",
};

const KEYWORDS: [string, string[]][] = [
  ["casco", ["casco", "helmet"]],
  ["gorra", ["gorra", "cachucha"]],
  ["gafas", ["gafas", "lentes", "monogafas", "espejuelos"]],
  ["guante", ["guante"]],
  ["camiseta", ["camiseta", "t-shirt", "tshirt", "polera", "franela"]],
  ["camisa", ["camisa", "guayabera"]],
  ["polo", ["polo"]],
  ["blusa", ["blusa"]],
  ["buso", ["buso", "buzo", "sudadera", "hoodie"]],
  ["chaqueta", ["chaqueta", "casaca", "jacket", "impermeable"]],
  ["chaleco", ["chaleco"]],
  ["overol", ["overol", "overall", "mono industrial"]],
  ["pantalon", ["pantalon", "pantalón", "jean", "jeans", "pants"]],
  ["bermuda", ["bermuda", "short"]],
  ["calzado", ["bota", "botas", "calzado", "zapato", "zapatos", "tenis", "botin"]],
];

export function detectGarmentType(name: string): string | null {
  const n = name.toLowerCase();
  for (const [key, keywords] of KEYWORDS) {
    if (keywords.some((k) => n.includes(k))) return key;
  }
  return null;
}

// La talla NO cambia el personaje: solo ajusta el ancho/profundidad de la prenda.
export function sizeFactor(size?: string): number {
  const s = (size || "").toUpperCase().trim();
  const letters: Record<string, number> = {
    XS: 0.93, S: 0.96, M: 1.0, L: 1.05, XL: 1.1, XXL: 1.16, XXXL: 1.22,
  };
  if (letters[s]) return letters[s];
  const n = Number(s);
  if (!Number.isNaN(n)) {
    if (n >= 36 && n <= 46) return 0.9 + (n - 36) * (0.32 / 10);
    if (n >= 28 && n <= 48) return 0.9 + (n - 28) * (0.3 / 20);
  }
  return 1.0;
}
