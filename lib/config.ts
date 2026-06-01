export const FREE_ITERATIONS_PER_PROJECT = Number(
  process.env.FREE_ITERATIONS_PER_PROJECT ?? 5,
);

export const PRICE_PER_EXTRA_ITERATION_PAISE = Number(
  process.env.PRICE_PER_EXTRA_ITERATION_PAISE ?? 99900,
);

export const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

export function formatINR(paise: number) {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}
