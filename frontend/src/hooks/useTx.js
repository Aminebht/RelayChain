import { useState } from "react";

export function useTx() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastHash, setLastHash] = useState("");

  const runTx = async (txPromise) => {
    try {
      setLoading(true);
      setError("");
      const tx = await txPromise;
      setLastHash(tx.hash || "");
      await tx.wait();
      return true;
    } catch (err) {
      const message = (err?.shortMessage || err?.message || "Echec de la transaction").slice(0, 280);
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { runTx, loading, error, lastHash };
}
