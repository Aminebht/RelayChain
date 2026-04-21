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
      console.error("Error details:", {
        code: err?.code,
        action: err?.action,
        shortMessage: err?.shortMessage,
        reason: err?.reason,
        error: err?.error,
        info: err?.info,
        revert: err?.revert,
        data: err?.data,
        message: err?.message
      });

      let message = err?.shortMessage || err?.message || "Echec de la transaction";

      // Handle ethers v6 "could not coalesce error"
      if (message.includes("could not coalesce error")) {
        message = "Transaction rejetée. Cause probable: solde insuffisant, gas limit trop bas, ou reversion du contrat.";
      }

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
        const revertMatch = hardhatMsg.match(/reverted with (?:reason string|custom error) ['"](.+?)['"]/);
        if (revertMatch) {
          message = revertMatch[1];
        } else {
          message = hardhatMsg;
        }
      } else if (err?.data?.message) {
        message = err.data.message;
      } else if (err?.transaction?.data && err?.receipt?.status === 0) {
        // Transaction was mined but failed
        message = "Transaction exécutée mais rejetée par le contrat (revert).";
      }

      // Try to extract revert reason from the error message itself
      const revertMatch2 = message.match(/reverted with reason string ['"](.+?)['"]/i);
      if (revertMatch2) {
        message = revertMatch2[1];
      }

      // Check for insufficient funds
      if (message.toLowerCase().includes("insufficient funds") ||
          err?.code === "INSUFFICIENT_FUNDS" ||
          err?.action === "sendTransaction" && message.includes("overflow")) {
        message = "Solde ETH insuffisant pour cette transaction (prix + frais gas).";
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
