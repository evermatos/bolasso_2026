import {
  AR, AT, AU, BA, BE, BR, CA, CD, CH, CI, CO, CV, CW, CZ, DE, DZ, EC,
  EG, ES, FR, GB_ENG, GB_SCT, GH, HT, IQ, IR, JO, JP, KR, MA, MX, NL,
  NO, NZ, PA, PT, PY, QA, SA, SE, SN, TN, TR, US, UY, UZ, ZA,
} from 'country-flag-icons/react/3x2'

type FlagComponent = typeof BR

const flags: Record<string, FlagComponent> = {
  Alemanha: DE,
  Argentina: AR,
  Argélia: DZ,
  'Arábia Saudita': SA,
  Austrália: AU,
  Áustria: AT,
  Bélgica: BE,
  'Bósnia e Herzegovina': BA,
  Brasil: BR,
  'Cabo Verde': CV,
  Canadá: CA,
  Catar: QA,
  Colômbia: CO,
  'Coreia do Sul': KR,
  'Costa do Marfim': CI,
  Curaçao: CW,
  Egito: EG,
  Equador: EC,
  Escócia: GB_SCT,
  Espanha: ES,
  'Estados Unidos': US,
  França: FR,
  Gana: GH,
  Haiti: HT,
  Inglaterra: GB_ENG,
  Iraque: IQ,
  Irã: IR,
  Japão: JP,
  Jordânia: JO,
  Marrocos: MA,
  México: MX,
  Noruega: NO,
  'Nova Zelândia': NZ,
  Panamá: PA,
  Paraguai: PY,
  'Países Baixos': NL,
  Portugal: PT,
  'RD Congo': CD,
  Senegal: SN,
  Suécia: SE,
  Suíça: CH,
  Tchéquia: CZ,
  Tunísia: TN,
  Turquia: TR,
  Uruguai: UY,
  Uzbequistão: UZ,
  'África do Sul': ZA,
}

export function TeamFlag({ team, fallback }: { team: string; fallback: string }) {
  const Flag = flags[team]

  return Flag ? (
    <Flag aria-label={`Bandeira de ${team}`} className="flag-image" role="img" />
  ) : (
    <span aria-hidden="true" className="flag">{fallback}</span>
  )
}
