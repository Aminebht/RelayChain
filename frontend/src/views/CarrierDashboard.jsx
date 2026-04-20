import { useEffect, useMemo, useState } from "react";
import { formatEth } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function CarrierDashboard({ wallet, relay, rep, tx, relayData }) {
  const [points, setPoints] = useState(0n);
  const [available, setAvailable] = useState(0n);
  const [actionError, setActionError] = useState("");

  const availableParcels = useMemo(() => {
    return relayData.parcels.filter(
      (p) =>
        (p.status === 0 || p.status === 1) &&
        (!p.carrier || p.carrier === "0x0000000000000000000000000000000000000000")
    );
  }, [relayData.parcels]);

  const mine = useMemo(() => {
    if (!wallet.address) return [];
    return relayData.parcels.filter(
      (p) => p.status === 2 && p.carrier && p.carrier.toLowerCase() === wallet.address.toLowerCase()
    );
  }, [relayData.parcels, wallet.address]);

  useEffect(() => {
    let active = true;
    const loadPoints = async () => {
      if (!wallet.address || !rep || !relay) return;
      try {
        const total = await rep.getPoints(wallet.address);
        const free = await relay.pointsAvailable(wallet.address);
        if (!active) return;
        setPoints(total);
        setAvailable(free);
      } catch {
        // Silently ignore errors on unmount
      }
    };
    loadPoints();
    return () => { active = false; };
  }, [wallet.address, rep, relay]);

  const handleAcceptParcel = async (parcelId) => {
    setActionError("");
    if (!relay) {
      setActionError("Contrat indisponible.");
      return;
    }

    const parcel = relayData.parcels.find((p) => p.id === parcelId);
    if (!parcel) {
      setActionError("Colis introuvable.");
      return;
    }

    if (parcel.status !== 1) {
      setActionError(`Statut invalide. Ce colis est "${["Publie", "Paye", "En transit", "Livre", "En litige", "Rembourse"][parcel.status]}". Seuls les colis "Paye" peuvent etre acceptes.`);
      return;
    }

    if (parcel.carrier && parcel.carrier !== "0x0000000000000000000000000000000000000000") {
      setActionError("Ce colis a deja ete accepte par un autre porteur.");
      return;
    }

    if (!wallet.address) {
      setActionError("Connectez votre wallet d'abord.");
      return;
    }

    if (parcel.sender?.toLowerCase() === wallet.address.toLowerCase()) {
      setActionError("Vous ne pouvez pas accepter votre propre colis (expediteur interdit).");
      return;
    }

    if (parcel.recipient?.toLowerCase() === wallet.address.toLowerCase()) {
      setActionError("Vous ne pouvez pas accepter un colis dont vous etes le destinataire.");
      return;
    }

    // Fetch fresh points data from contract for accurate validation
    let freshAvailable = 0n;
    try {
      freshAvailable = await relay.pointsAvailable(wallet.address);
    } catch {
      setActionError("Impossible de verifier vos points de reputation.");
      return;
    }

    // Check points requirement for parcels >= 0.005 ETH
    const MIN_VALUE_NO_POINTS = 5000000000000000n; // 5e15 = 0.005 ETH
    if (parcel.price >= MIN_VALUE_NO_POINTS && freshAvailable < parcel.price) {
      setActionError(
        `Points insuffisants. Vous avez ${formatEth(freshAvailable)} points disponibles mais ce colis necessite ${formatEth(parcel.price)} points en garantie. ` +
        `Demandez au proprietaire de la plateforme de vous onboarder (donne 10 points de depart).`
      );
      return;
    }

    console.log("Accepting parcel:", {
      id: parcel.id,
      price: parcel.price.toString(),
      sender: parcel.sender,
      recipient: parcel.recipient,
      wallet: wallet.address,
      available: freshAvailable.toString()
    });

    const ok = await tx.runTx(relay.acceptParcel(parcelId));
    if (ok) {
      await relayData.refresh();
    } else {
      setActionError("Impossible d'accepter ce colis.");
    }
  };

  const locked = points > available ? points - available : 0n;

  return (
    <>
      <div className="page-header">
        <h1>Portail Porteur</h1>
        <p>Acceptez une mission et livrez directement au destinataire.</p>
      </div>

      <section className="grid two">
        <article className="panel span-all">
          <h2>Mes Points de Réputation</h2>
          <p className="muted">
            Total {formatEth(points)} · disponibles {formatEth(available)} · verrouillés {formatEth(locked)}
          </p>
        </article>

        <article className="panel span-all">
          <h2>Colis Disponibles</h2>
          <ParcelTable
            parcels={availableParcels}
            onAccept={handleAcceptParcel}
            isConnected={wallet.isConnected}
            isLoading={tx.loading}
          />
        </article>

        <article className="panel span-all">
          <h2>Mes Livraisons en Cours</h2>
          <ParcelTable parcels={mine} />
        </article>

        {actionError && <div className="error-banner error-banner-inline">{actionError}</div>}
        {!wallet.isConnected && (
          <div className="error-banner error-banner-inline" role="status">
            Connectez votre wallet pour executer ces actions.
          </div>
        )}
      </section>
    </>
  );
}
