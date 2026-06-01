/**
 * Plantillas de marca para informes PDF (antropométrico + dashboard).
 *
 * Cada empresa elige una plantilla vía `companies.brand_template`. El default
 * es NuPlan (verde corporativo). swiss_medical sobreescribe el header con el
 * logo de Swiss Medical y su paleta de rojos.
 *
 * Para agregar una empresa nueva con branding propio:
 *   1. Sumar el logo a src/assets/branding/<nombre>.png
 *   2. Importarlo acá y agregar la entry en `BRAND_TEMPLATES`
 *   3. Agregar el valor al CHECK de la migración 011 (o usar brand_config
 *      jsonb para overrides puntuales sin tocar el schema).
 */

import { BRAND } from './branding';
import swissMedicalLogo from '../assets/branding/wellness-lab-swiss-medical.png';

export type BrandTemplateKey = 'default' | 'swiss_medical';

export interface BrandTemplate {
  key: BrandTemplateKey;
  label: string;
  description: string;
  /** URL del logo a renderizar en el header (opcional — si falta, se usa texto). */
  logoUrl?: string;
  /** Alto del logo en el header del informe, en px. */
  logoHeightPx?: number;
  colors: {
    primary: string;
    primaryLight: string;
    accent: string;
    /** Color del header (gradiente o sólido). Por default usa primary→primaryLight. */
    headerBg?: string;
  };
  /** Texto del subheader (debajo del título del informe). */
  professionalName: string;
  professionalRole: string;
  website: string;
  /** Si es false, no muestra el nombre/rol de la nutricionista en el header. */
  showProfessionalInHeader: boolean;
}

const DEFAULT_TEMPLATE: BrandTemplate = {
  key: 'default',
  label: 'NuPlan (default)',
  description: 'Header verde corporativo con nombre de la licenciada.',
  colors: {
    primary:      BRAND.colors.primary,
    primaryLight: BRAND.colors.primaryLight,
    accent:       BRAND.colors.accent,
  },
  professionalName: BRAND.professional,
  professionalRole: BRAND.professionalRole,
  website:          BRAND.website,
  showProfessionalInHeader: true,
};

const SWISS_MEDICAL_TEMPLATE: BrandTemplate = {
  key: 'swiss_medical',
  label: 'WellnessLab (Swiss Medical)',
  description: 'Header con logo WellnessLab by Swiss Medical en paleta roja corporativa.',
  logoUrl:      swissMedicalLogo,
  logoHeightPx: 40,
  colors: {
    // Paleta de marca Swiss Medical / WellnessLab: rojo corporativo con degradé
    // hacia un bordó profundo para que los headers no queden planos. El header
    // mantiene fondo blanco para preservar la legibilidad del logo.
    primary:      '#E2231A',
    primaryLight: '#A5101A',
    accent:       '#E2231A',
    headerBg:     '#ffffff',
  },
  professionalName: BRAND.professional,
  professionalRole: `${BRAND.professionalRole} · M.N. 3884`,
  website:          BRAND.website,
  showProfessionalInHeader: true,
};

export const BRAND_TEMPLATES: Record<BrandTemplateKey, BrandTemplate> = {
  default:        DEFAULT_TEMPLATE,
  swiss_medical:  SWISS_MEDICAL_TEMPLATE,
};

/** Devuelve la template para una key, cayendo a default si no se reconoce. */
export function getBrandTemplate(key: string | null | undefined): BrandTemplate {
  if (key && key in BRAND_TEMPLATES) return BRAND_TEMPLATES[key as BrandTemplateKey];
  return DEFAULT_TEMPLATE;
}

/** Lista para selectores de UI. */
export const BRAND_TEMPLATE_OPTIONS: Array<{ value: BrandTemplateKey; label: string; description: string }> =
  (Object.keys(BRAND_TEMPLATES) as BrandTemplateKey[]).map(k => ({
    value: k,
    label: BRAND_TEMPLATES[k].label,
    description: BRAND_TEMPLATES[k].description,
  }));
