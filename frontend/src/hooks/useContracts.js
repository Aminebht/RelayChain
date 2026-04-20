import { useMemo } from "react";
import { ethers } from "ethers";
import { RELAY_ADDRESS, REP_ADDRESS } from "../config/addresses";
import { RELAY_ABI, REP_ABI } from "../config/abi";

export function useContracts(signerOrProvider) {
  return useMemo(() => {
    if (!signerOrProvider) {
      return { relay: null, rep: null };
    }

    const relay = new ethers.Contract(RELAY_ADDRESS, RELAY_ABI, signerOrProvider);
    const rep = new ethers.Contract(REP_ADDRESS, REP_ABI, signerOrProvider);

    return { relay, rep };
  }, [signerOrProvider]);
}
