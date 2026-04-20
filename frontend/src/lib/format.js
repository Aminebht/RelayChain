import { ethers } from "ethers";

export function shortAddress(value) {
  if (!value || value === "0x") {
    return "-";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatEth(wei, options = {}) {
  const { locale = "fr-FR", maximumFractionDigits = 4 } = options;

  try {
    const formatted = ethers.formatEther(wei);
    const [rawInt, rawFrac = ""] = formatted.split(".");
    const trimmedFrac = rawFrac.slice(0, maximumFractionDigits);
    const roundedSource = trimmedFrac ? `${rawInt}.${trimmedFrac}` : rawInt;
    const numeric = Number(roundedSource);
    if (!Number.isFinite(numeric)) {
      return "0 ETH";
    }

    const value = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits
    }).format(numeric);
    return `${value} ETH`;
  } catch {
    return "0 ETH";
  }
}

export function toWei(value) {
  return ethers.parseEther(value || "0");
}

export function parseHashInput(input) {
  if (!input) {
    return ethers.ZeroHash;
  }
  if (input.startsWith("0x") && input.length === 66) {
    return input;
  }
  return ethers.id(input);
}

export function statusLabel(status) {
  const map = {
    0: "Publie",
    1: "Paye",
    2: "En transit",
    3: "Livre",
    4: "En litige",
    5: "Rembourse"
  };
  return map[Number(status)] || `Inconnu(${status})`;
}

export function formatCount(value, locale = "fr-FR") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "0";
  }

  return new Intl.NumberFormat(locale).format(amount);
}
