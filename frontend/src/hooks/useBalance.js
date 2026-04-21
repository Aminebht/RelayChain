import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";

export function useBalance(address, provider) {
  const [balance, setBalance] = useState(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchBalance = useCallback(async () => {
    if (!address || !provider) {
      setBalance(0n);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const bal = await provider.getBalance(address);
      setBalance(bal);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setError("Impossible de récupérer le solde");
    } finally {
      setLoading(false);
    }
  }, [address, provider]);

  useEffect(() => {
    fetchBalance();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, loading, error, refresh: fetchBalance };
}
