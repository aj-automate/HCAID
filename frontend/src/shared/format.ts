const eur0 = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eur2 = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })

export const euro = (n: number) => eur0.format(n)
export const euroCents = (n: number) => eur2.format(n)
export const pct = (p: number, digits = 0) => `${(p * 100).toFixed(digits).replace('.', ',')}%`
export const pp = (p: number) => `${Math.abs(p * 100).toFixed(0)} procentpunt`
export const decimal = (n: number, digits = 1) => n.toFixed(digits).replace('.', ',')
