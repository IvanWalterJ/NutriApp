/**
 * Branding central. Cualquier referencia hardcoded a "NuPlan", al sitio,
 * a la profesional o a los colores debería pasar por acá. Cuando lleguen
 * los assets definitivos de Rosana (rosa pomelo) basta con cambiar este
 * archivo + las variables en src/index.css.
 */

export const BRAND = {
  /** Nombre corto, usado en sidebars y headers cortos. */
  name: 'NuPlan',
  /** Nombre largo para títulos y firma. */
  fullName: 'NuPlan',
  /** Tagline / subtítulo. */
  tagline: 'Plataforma Nutricional',
  /** Dominio público (sin protocolo). */
  website: 'www.nuplan.com.ar',
  /** Profesional firmante en informes. */
  professional: 'Lic. Rosana Roldán',
  /** Especialidad mostrada bajo el nombre. */
  professionalRole: 'Licenciada en Nutrición',
  /** Colores hex literales — para usar dentro de SVGs, gradientes inline y PDFs
   *  donde no se puede leer la variable CSS. En clases Tailwind usá los
   *  tokens (--color-primary, etc.) que también se actualizan desde index.css. */
  colors: {
    primary:      '#E8472A',
    primaryLight: '#F47A62',
    accent:       '#F6A29A',
    accentDark:   '#C53A1E',
  },
} as const;

export type BrandConfig = typeof BRAND;
