/**
 * Ilustrační fotky psů z Unsplash (licence Unsplash: zdarma i pro komerční použití, bez povinného uvedení autora).
 * Nejsou to naši zákazníci ani naše prodejna; jakmile budou vlastní fotky, nahraďte je.
 */
export type StockPhoto = { src: string; alt: string; author: string; page: string };

export const STOCK_PHOTOS = {
  /** Border kolie u misky. Hero na úvodní stránce. */
  dogBowl: {
    src: "https://images.unsplash.com/photo-1632236568054-12f36ecee2f6?auto=format&fit=crop&w=1200&q=80",
    alt: "Pes jí z misky",
    author: "Ayla Verschueren",
    page: "https://unsplash.com/photos/QIbjKOsmIhQ",
  },
  /** Zlatý retrívr. Blok Krmení na míru. */
  goldenRetriever: {
    src: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1200&q=80",
    alt: "Zlatý retrívr",
    author: "Victor G",
    page: "https://unsplash.com/photos/x5oPmHmY3kQ",
  },
} satisfies Record<string, StockPhoto>;
