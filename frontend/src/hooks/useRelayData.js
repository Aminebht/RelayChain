import { useCallback, useEffect, useRef, useState } from "react";

export function useRelayData(relay, address) {
  const [parcels, setParcels] = useState([]);
  const [platformReserve, setPlatformReserve] = useState(0n);
  const [pendingRefund, setPendingRefund] = useState(0n);
  const [owner, setOwner] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (!relay) {
      setParcels([]);
      setPlatformReserve(0n);
      setPendingRefund(0n);
      setOwner("");
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const count = Number(await relay.parcelCount());
      const list = [];

      for (let i = 1; i <= count; i += 1) {
        const p = await relay.parcels(i);
        list.push({
          id: i,
          sender: p.sender,
          recipient: p.recipient,
          carrier: p.carrier,
          price: p.price,
          pickupLocation: p.pickupLocation,
          dropoffLocation: p.dropoffLocation,
          status: Number(p.status),
          createdAt: Number(p.createdAt),
          lastActionAt: Number(p.lastActionAt)
        });
      }

      if (requestRef.current !== requestId) {
        return;
      }

      setParcels(list.reverse());
      setPlatformReserve(await relay.platformReserve());
      setOwner(await relay.platformOwner());

      if (address) {
        setPendingRefund(await relay.pendingRefunds(address));
      } else {
        setPendingRefund(0n);
      }
    } catch (err) {
      if (requestRef.current === requestId) {
        setError((err?.shortMessage || err?.message || "Impossible de charger les donnees.").slice(0, 280));
      }
    } finally {
      setLoading(false);
    }
  }, [relay, address]);

  useEffect(() => {
    refresh();
    return () => {
      requestRef.current += 1;
    };
  }, [refresh]);

  return {
    parcels,
    platformReserve,
    pendingRefund,
    owner,
    loading,
    error,
    refresh
  };
}
