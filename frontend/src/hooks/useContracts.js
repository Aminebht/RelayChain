import { useMemo, useEffect, useState } from "react";
import { ethers } from "ethers";
import { RELAY_ADDRESS, REP_ADDRESS } from "../config/addresses";
import { RELAY_ABI, REP_ABI } from "../config/abi";

export function useContracts(signerOrProvider) {
  const [contractError, setContractError] = useState("");

  const contracts = useMemo(() => {
    if (!signerOrProvider) {
      return { relay: null, rep: null };
    }

    const relay = new ethers.Contract(RELAY_ADDRESS, RELAY_ABI, signerOrProvider);
    const rep = new ethers.Contract(REP_ADDRESS, REP_ABI, signerOrProvider);

    return { relay, rep };
  }, [signerOrProvider]);

  // Verify contracts are deployed
  useEffect(() => {
    if (!signerOrProvider || !contracts.relay) return;

    const checkContracts = async () => {
      try {
        await contracts.relay.platformOwner();
        setContractError("");
      } catch (err) {
        console.error("Contract verification failed:", err);
        setContractError(
          `Contrats non deployes à ${RELAY_ADDRESS}. Redeployez avec: npm run deploy:local:sync`
        );
      }
    };

    checkContracts();
  }, [signerOrProvider, contracts.relay]);

  return { ...contracts, contractError };
}
