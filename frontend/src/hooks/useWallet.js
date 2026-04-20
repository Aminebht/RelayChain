import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

export function useWallet() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState("");
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState("");

  const connect = useCallback(async () => {
    try {
      setError("");
      if (!window.ethereum) {
        throw new Error("MetaMask n'est pas disponible");
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const nextSigner = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(nextSigner);
      setAddress(await nextSigner.getAddress());
      setChainId(Number(network.chainId));
    } catch (err) {
      setError(err.message || "Echec de connexion du wallet");
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    const onAccountsChanged = async (accounts) => {
      if (!accounts.length) {
        setAddress("");
        setSigner(null);
        return;
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const nextSigner = await browserProvider.getSigner();
      setProvider(browserProvider);
      setSigner(nextSigner);
      setAddress(accounts[0]);
    };

    const onChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, []);

  const isConnected = useMemo(() => Boolean(address && signer), [address, signer]);

  return {
    provider,
    signer,
    address,
    chainId,
    error,
    isConnected,
    connect
  };
}
