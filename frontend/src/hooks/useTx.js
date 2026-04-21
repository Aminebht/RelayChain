import { useState } from "react";

export function useTx() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastHash, setLastHash] = useState("");

  const executeTx = async (txFactory) => {
    let tx;
    if (typeof txFactory === "function") {
      const txPromise = txFactory();
      tx = await txPromise;
    } else {
      tx = await txFactory;
    }
    setLastHash(tx.hash || "");
    await tx.wait();
    return true;
  };

  const runTx = async (txFactory) => {
    try {
      setLoading(true);
      setError("");

      // First attempt
      try {
        return await executeTx(txFactory);
      } catch (firstErr) {
        // Check if it's a nonce, provider sync, or network error that typically resolves on retry
        const errMsg = (firstErr?.message || firstErr?.shortMessage || "").toLowerCase();
        const isRetryable =
          firstErr?.code === "NONCE_EXPIRED" ||
          firstErr?.code === "REPLACEMENT_UNDERPRICED" ||
          firstErr?.code === "TRANSACTION_REPLACED" ||
          firstErr?.code === "TIMEOUT" ||
          firstErr?.code === "NETWORK_ERROR" ||
          firstErr?.code === "SERVER_ERROR" ||
          firstErr?.code === -32000 || // Generic JSON-RPC error (often provider sync)
          errMsg.includes("nonce") ||
          errMsg.includes("replacement") ||
          errMsg.includes("known transaction") ||
          errMsg.includes("underlying network changed") ||
          errMsg.includes("could not coalesce") ||
          errMsg.includes("unknown account") ||
          errMsg.includes("internal json-rpc error");

        if (isRetryable) {
          console.log("First transaction attempt failed with retryable error, retrying...", firstErr?.message || firstErr?.code);
          // Small delay to allow provider state to sync
          await new Promise(resolve => setTimeout(resolve, 500));
          return await executeTx(txFactory);
        }
        // Not a retryable error, throw to outer catch
        throw firstErr;
      }
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

      // Handle generic JSON-RPC errors - try to extract revert reason from data
      if (message.includes("Internal JSON-RPC error")) {
        // Try to extract revert reason from various error structures
        const revertReason =
          err?.data?.message ||
          err?.error?.data?.message ||
          err?.info?.error?.data?.message ||
          err?.payload?.error?.message ||
          err?.reason;

        if (revertReason) {
          // Extract readable part from revert messages
          const revertMatch = revertReason.match(/reverted with reason string ['"](.+?)['"]/);
          if (revertMatch) {
            message = revertMatch[1];
          } else if (revertReason.includes("execution reverted")) {
            message = revertReason.replace("execution reverted: ", "").replace("execution reverted", "Contrat rejeté");
          } else {
            message = revertReason;
          }
        } else {
          message = "Transaction rejetée par le contrat. Vérifiez les conditions (statut, rôle, solde).";
        }
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
