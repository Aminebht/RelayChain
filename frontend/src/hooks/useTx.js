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
      console.error("Transaction error:", err);
      let message = err?.shortMessage || err?.message || "Echec de la transaction";
      
      // Extract revert reason from Hardhat/ethers errors
      if (err?.revert?.args?.length) {
        message = `Contrat rejeté: ${err.revert.args.join(" ")}`;
      } else if (err?.reason) {
        message = err.reason;
      } else if (err?.error?.reason) {
        message = err.error.reason;
      } else if (err?.info?.error?.message) {
        // Hardhat specific error nesting
        const hardhatMsg = err.info.error.message;
        // Extract revert reason from Hardhat's revert message format
        const revertMatch = hardhatMsg.match(/reverted with reason string ['"](.+?)['"]/);
        if (revertMatch) {
          message = revertMatch[1];
        } else {
          message = hardhatMsg;
        }
      } else if (err?.data?.message) {
        message = err.data.message;
      }
      
      // Clean up common Hardhat error wrappers
      if (message.includes("out of gas") && err?.error?.message) {
        message = err.error.message;
      }
      if (message.includes("missing revert data") && err?.info?.error?.message) {
        message = "Transaction rejetée par le contrat. Vérifiez les conditions (statut, rôle, points).";
      }
      
      setError(message.slice(0, 280));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { runTx, loading, error, lastHash };
}
