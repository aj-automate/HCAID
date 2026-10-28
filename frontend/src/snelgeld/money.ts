export const PROTECTION_FEE = 4.95

export function monthlyFor(amount: number, apr: number, months: number) {
  const r = apr / 100 / 12
  return (amount * r) / (1 - (1 + r) ** -months)
}
