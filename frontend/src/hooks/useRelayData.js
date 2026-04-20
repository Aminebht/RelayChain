import { useCallback, useEffect, useState } from "react";

export function useRelayData(relay, address) {
  const [parcels, setParcels] = useState([]);
  const [platformReserve, setPlatformReserve] = useState(0n);
  const [pendingRefund, setPendingRefund] = useState(0n);
  const [owner, setOwner] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!relay) {
      setParcels([]);
      return;
    }

    setLoading(true);
    try {
      const count = Number(await relay.parcelCount());
      const list = [];

      for (let i = 1; i <= count; i += 1) {
        const p = await relay.parcels(i);
        list.push({
          id: i,
          sender: p.sender,
          recipient: p.recipient,
          price: p.price,
          status: Number(p.status),
          currentHop: Number(p.currentHop),
          createdAt: Number(p.createdAt),
          lastActionAt: Number(p.lastActionAt)
        });
      }

      setParcels(list.reverse());
      setPlatformReserve(await relay.platformReserve());
      setOwner(await relay.platformOwner());

      if (address) {
        setPendingRefund(await relay.pendingRefunds(address));
      }
    } finally {
      setLoading(false);
    }
  }, [relay, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    parcels,
    platformReserve,
    pendingRefund,
    owner,
    loading,
    refresh
  };
}
