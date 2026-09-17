"""Catalogo de prendas para el probador virtual y la dotacion.

Define los tipos de prenda, la capa a la que pertenecen y el tipo de
tallas que manejan, ademas de inferir estos datos a partir del nombre del
producto cuando no estan configurados explicitamente en la base de datos.

Este modulo es la unica fuente de verdad compartida entre el backend y el
probador 3D del frontend.
"""

from typing import TypedDict


class LayerDef(TypedDict):
    key: str
    label: str


# Capas ordenadas de arriba (cabeza) hacia abajo. El orden tambien define el
# orden de las categorias en la interfaz y el orden de dibujado del 3D.
LAYERS: list[LayerDef] = [
    {"key": "head", "label": "Cabeza"},
    {"key": "face", "label": "Proteccion facial"},
    {"key": "top", "label": "Parte superior"},
    {"key": "mid", "label": "Segunda capa"},
    {"key": "jacket", "label": "Chaqueta"},
    {"key": "vest", "label": "Chaleco"},
    {"key": "bottom", "label": "Parte inferior"},
    {"key": "footwear", "label": "Calzado"},
    {"key": "accessory", "label": "Accesorios"},
]

LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
PANTS_SIZES = [str(n) for n in range(28, 48, 2)]
SHOE_SIZES = [str(n) for n in range(36, 47)]
GLOVE_SIZES = ["S", "M", "L", "XL"]

# garment_type -> (capa, clase de tallas, etiqueta)
GARMENTS: dict[str, dict[str, str]] = {
    "camiseta": {"layer": "top", "sizes": "letters", "label": "Camiseta"},
    "camisa": {"layer": "top", "sizes": "letters", "label": "Camisa"},
    "polo": {"layer": "top", "sizes": "letters", "label": "Polo"},
    "blusa": {"layer": "top", "sizes": "letters", "label": "Blusa"},
    "buso": {"layer": "mid", "sizes": "letters", "label": "Buso"},
    "sudadera": {"layer": "mid", "sizes": "letters", "label": "Sudadera"},
    "chaqueta": {"layer": "jacket", "sizes": "letters", "label": "Chaqueta"},
    "chaleco": {"layer": "vest", "sizes": "letters", "label": "Chaleco"},
    "overol": {"layer": "bottom", "sizes": "letters", "label": "Overol"},
    "pantalon": {"layer": "bottom", "sizes": "pants", "label": "Pantalon"},
    "jean": {"layer": "bottom", "sizes": "pants", "label": "Jean"},
    "bermuda": {"layer": "bottom", "sizes": "pants", "label": "Bermuda"},
    "calzado": {"layer": "footwear", "sizes": "shoes", "label": "Calzado"},
    "casco": {"layer": "head", "sizes": "one", "label": "Casco"},
    "gorra": {"layer": "head", "sizes": "one", "label": "Gorra"},
    "gafas": {"layer": "face", "sizes": "one", "label": "Gafas"},
    "guante": {"layer": "accessory", "sizes": "gloves", "label": "Guantes"},
}

# Palabras clave para inferir el tipo de prenda a partir del nombre.
KEYWORDS: list[tuple[str, list[str]]] = [
    ("casco", ["casco", "helmet"]),
    ("gorra", ["gorra", "cachucha"]),
    ("gafas", ["gafas", "lentes", "monogafas", "espejuelos"]),
    ("guante", ["guante"]),
    ("camiseta", ["camiseta", "t-shirt", "tshirt", "polera", "franela"]),
    ("camisa", ["camisa", "guayabera"]),
    ("polo", ["polo ", "tipo polo", "polo m"]),
    ("blusa", ["blusa"]),
    ("buso", ["buso", "buzo", "sudadera", "hoodie"]),
    ("chaqueta", ["chaqueta", "casaca", "jacket", "impermeable"]),
    ("chaleco", ["chaleco"]),
    ("overol", ["overol", "overall", "mono industrial"]),
    ("pantalon", ["pantalon", "pantalón", "jean", "jeans", "pants"]),
    ("bermuda", ["bermuda", "short"]),
    ("calzado", ["bota", "botas", "calzado", "zapato", "zapatos", "tenis", "botin"]),
]

_GENDER_KEYWORDS: list[tuple[str, list[str]]] = [
    ("mujer", ["dama", "mujer", "femenin", "female", "lady", "señora", "senora"]),
    ("hombre", ["caballero", "hombre", "masculin", "male", "varon", "varón"]),
]


def sizes_for_class(size_class: str) -> list[str]:
    if size_class == "letters":
        return list(LETTER_SIZES)
    if size_class == "pants":
        return list(PANTS_SIZES)
    if size_class == "shoes":
        return list(SHOE_SIZES)
    if size_class == "gloves":
        return list(GLOVE_SIZES)
    return ["Ajustable"]


def infer_garment_type(name: str) -> str | None:
    n = (name or "").lower()
    for garment, keywords in KEYWORDS:
        if any(k in n for k in keywords):
            return garment
    return None


def infer_gender(name: str) -> str:
    n = (name or "").lower()
    for gender, keywords in _GENDER_KEYWORDS:
        if any(k in n for k in keywords):
            return gender
    return "unisex"


def resolve_product_fit(product) -> dict:
    """Combina los atributos configurados del producto con la inferencia."""
    raw_type = getattr(product, "garment_type", None)
    garment_type = raw_type or infer_garment_type(product.name)

    layer = getattr(product, "layer", None)
    size_class = "letters"
    if garment_type and garment_type in GARMENTS:
        layer = layer or GARMENTS[garment_type]["layer"]
        size_class = GARMENTS[garment_type]["sizes"]

    gender = getattr(product, "gender", None) or infer_gender(product.name)
    sizes = getattr(product, "available_sizes", None)
    if not sizes:
        sizes = sizes_for_class(size_class)

    return {
        "garment_type": garment_type,
        "layer": layer,
        "gender": gender,
        "sizes": list(sizes),
        "size_class": size_class,
    }
