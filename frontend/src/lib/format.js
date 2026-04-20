import { ethers } from "ethers";

export function shortAddress(value) {
  if (!value || value === "0x") {
    return "-";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function formatEth(wei) {
  try {
    return `${Number(ethers.formatEther(wei)).toFixed(4)} ETH`;
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
    0: "Posted",
    1: "Paid",
    2: "InTransit",
    3: "AwaitingNextCarrier",
    4: "Delivered",
    5: "Disputed",
    6: "Refunded"
  };
  return map[Number(status)] || `Unknown(${status})`;
}
