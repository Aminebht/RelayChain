# RelayChain
## Traçabilité Décentralisée de Colis sur Ethereum
### Projet DApp Blockchain — Spécification Technique et Plan d'Implémentation

---

| | |
|---|---|
| **Projet** | RelayChain — Crowdshipping décentralisé |
| **Technologie** | Ethereum · Solidity · React · ethers.js |
| **Réseau** | Ganache (testnet local) · MetaMask |
| **Date** | Avril 2026 |

---

## 1. Introduction — La Problématique

La livraison du dernier kilomètre dans les villes denses comme Tunis repose entièrement sur des véhicules dédiés, des infrastructures d'entrepôts et des coursiers coûteux. Ce modèle est onéreux (le dernier kilomètre représente 40 à 60 % du coût logistique total), polluant, et exclut les artisans locaux de tout accès à une livraison abordable.

**Relay** est un concept de crowdshipping sans véhicule, dans lequel des navetteurs ordinaires transportent des colis un tronçon à la fois, en gagnant des points échangeables sur une marketplace locale.

Ce modèle pose deux problèmes fondamentaux que la blockchain résout :

- **La confiance** : comment prouver sans autorité centrale qu'un colis a bien été transmis intact, à un instant et un lieu précis ?
- **Le paiement** : le cash est physique et invérifiable on-chain — le COD est incompatible avec la blockchain.

**RelayChain** répond aux deux. Le prix est payé en ligne par le destinataire et bloqué dans un smart contract. La chaîne de possession est enregistrée comme une suite d'événements immuables. En cas de problème, les deux parties lésées sont intégralement remboursées grâce au fonds de réserve de la plateforme, et le porteur fautif est pénalisé en points.

| Problème | Solution Blockchain |
|---|---|
| Preuve de transfert | Chaque handoff = événement immuable on-chain horodaté |
| Paiement garanti | Prix bloqué dans le smart contract dès la commande |
| Litige sans arbitre humain | Photo hash chain identifie le tronçon fautif automatiquement |
| Responsabilisation porteur | Pénalité en points = valeur exacte du colis |
| Fonds d'indemnisation | 5% de chaque transaction alimente la réserve plateforme |

---

## 2. Principes Blockchain Appliqués

| Principe | Mécanisme concret |
|---|---|
| **Décentralisation** | Aucune entreprise ne détient les fonds — le smart contract gère tout |
| **Immuabilité** | Chaque transfert est un événement permanent et infalsifiable on-chain |
| **Transparence** | N'importe qui peut consulter l'historique complet d'un colis ou d'un porteur |
| **Consensus** | Un transfert n'est validé que quand les deux porteurs confirment simultanément |
| **Sans intermédiaire** | Les fonds sont libérés automatiquement par le code — aucune action manuelle |

---

## 3. Modèle Économique et Flux des Fonds

### 3.1 Structure simple

```
Seuls les fonds du destinataire sont bloqués dans le contrat :

[ Destinataire paie price = 100 DT ]
              ↓
    [ Smart Contract ]
              ↓
   Livraison confirmée :
   ├── 95 DT (95%) → Expéditeur
   └──  5 DT  (5%) → Réserve Plateforme
```

Pas de caution expéditeur. Pas de caution porteur en ETH.  
La responsabilisation des porteurs est gérée **uniquement par les points**.

### 3.2 Le système de points comme caution

Les points ne sont pas qu'une récompense — ils sont aussi la **garantie financière** de chaque porteur.

**Règle fondamentale :**
> Un porteur ne peut pas accepter un colis si son solde de points est inférieur à la valeur du colis.

Exemple : un colis d'une valeur de 80 DT ne peut être accepté que par un porteur ayant au moins 80 points.

Cela signifie que les points représentent une valeur réelle et engagée — un porteur qui accepte un colis met implicitement en jeu l'équivalent de sa valeur.

### 3.3 Pénalité en cas de faute

Si un porteur est déclaré fautif (colis perdu ou endommagé) :

```
Porteur fautif perd exactement "price" en points
Exemple : colis de 100 DT → porteur perd 100 points
```

Ce n'est pas une perte totale — c'est une perte proportionnelle et juste. Un porteur sérieux avec 500 points qui perd un colis de 100 DT se retrouve avec 400 points. Il peut continuer à travailler mais avec moins de capacité d'acceptation.

### 3.4 Remboursement en cas de litige

En cas de colis perdu ou endommagé, **les deux parties sont intégralement remboursées** grâce à la réserve plateforme accumulée via les 5% :

```
Colis perdu ou endommagé (valeur : 100 DT) :

├── Destinataire → remboursé 100 DT (depuis les fonds bloqués dans le contrat)
├── Expéditeur   → remboursé 100 DT (depuis la réserve plateforme)
└── Porteur fautif → perd 100 points
```

### 3.5 Tableau complet des scénarios

| Situation | Destinataire | Expéditeur | Plateforme | Porteur fautif | Porteurs innocents |
|---|---|---|---|---|---|
| Livraison parfaite | Reçoit le colis | +95 DT | +5 DT (réserve) | — | +points de livraison |
| Colis endommagé | +100 DT remboursé | +100 DT remboursé | -100 DT (réserve) | -100 points | +points de livraison |
| Colis perdu | +100 DT remboursé | +100 DT remboursé | -100 DT (réserve) | -100 points | +points de livraison |

### 3.6 Pourquoi les 5% suffisent comme fonds d'assurance

La réserve plateforme s'accumule à chaque livraison réussie. Les litiges sont rares par construction (chaîne de photos, double confirmation, règle de points minimum). Sur 1000 livraisons à 100 DT chacune :

```
Réserve accumulée : 1000 × 5 DT = 5 000 DT
Litiges estimés (1%) : 10 × 200 DT (remboursement × 2) = 2 000 DT
Réserve nette : 3 000 DT
```

La plateforme reste solvable tant que le taux de litige reste raisonnable — ce que le système de points et de niveaux est précisément conçu à minimiser.

---

## 4. Architecture du Système

### 4.1 Pile technique

| Couche | Technologie | Rôle |
|---|---|---|
| Blockchain | Ethereum (Ganache local) | Registre de transactions, exécution des smart contracts |
| Smart Contracts | Solidity 0.8.x | Paiement, transferts, réserve, réputation |
| Portefeuille | MetaMask | Identité utilisateur, signature des transactions |
| Interface | React + ethers.js | IHM pour tous les rôles |
| Stockage fichiers | IPFS (ou hash simulé) | Photos de transfert — hash stocké on-chain |
| Outils de dev | Remix IDE + Hardhat | Tests et déploiement |

### 4.2 Acteurs et rôles

- **Destinataire** — Commande sur la marketplace, paie le prix on-chain, confirme la réception
- **Expéditeur** — Publie le colis, reçoit 95% du prix à livraison confirmée, remboursé intégralement en cas de litige
- **Porteur** — Accepte un tronçon si points ≥ price, confirme les transferts, gagne des points, risque d'en perdre
- **Smart Contract** — Bloque les fonds, enregistre la chaîne de possession, libère automatiquement
- **Plateforme (owner)** — Perçoit 5%, maintient la réserve, résout les litiges, ne peut pas toucher aux fonds des utilisateurs

### 4.3 Schéma d'architecture

```
[ Destinataire ] ──── payForParcel(100 DT) ────────────────────────────────┐
                                                                            ↓
[ Expéditeur ]  ──── postParcel() ──────────────────────────► [ RelayEscrow.sol ]
                                                                     ↕
[ Porteur A ]   ──── acceptLeg() [vérifie points ≥ price] ──► [ CarrierReputation.sol ]
                ──── confirmHandoff(hashPhoto) ──────────────►       ↕
                                                               (points, niveaux,
[ Porteur B ]   ──── confirmHandoff(hashPhoto) ─────────────►  pénalités)
                ──── confirmHandoff(hashPhoto vers destinataire)

[ Destinataire ] ──── confirmDelivery() ──────────────────────────────────────┐
                                                                               ↓
                                                           ┌─ 95 DT → Expéditeur
                                                           ├──  5 DT → Réserve Plateforme
                                                           └─ Points → Porteurs

[ Litige ] ──── openDispute() → resolveDispute(faultyHop) ────────────────────┐
                                                                               ↓
                                                           ┌─ 100 DT → Destinataire (contrat)
                                                           ├─ 100 DT → Expéditeur (réserve)
                                                           └─ -100 pts → Porteur fautif
```

---

## 5. Smart Contracts — Description Technique

### 5.1 RelayEscrow.sol

Contrat principal. Gère le cycle de vie complet : paiement, tronçons, transferts, réserve, litiges.

#### Variables d'état

```solidity
enum ParcelStatus { Posted, Paid, InTransit, Delivered, Disputed }

struct Parcel {
    address sender;            // expéditeur / vendeur
    address recipient;         // destinataire / acheteur
    uint256 price;             // prix total payé par le destinataire
    ParcelStatus status;
    address[] carrierChain;    // liste ordonnée des porteurs
    uint8 currentHop;          // tronçon en cours
    bytes32[] photoHashes;     // SHA-256 photo par tronçon
    uint8 faultyHop;           // tronçon fautif (défini lors du litige)
}

mapping(uint256 => Parcel) public parcels;
uint256 public parcelCount;
uint256 public platformReserve;   // fonds de réserve accumulés (5%)
address public platformOwner;
```

#### Fonctions principales

| Fonction | Appelée par | Description |
|---|---|---|
| `postParcel(recipient, price)` | Expéditeur | Publie le colis avec son prix déclaré. Statut = Posted. |
| `payForParcel(parcelId)` | Destinataire | Paie le prix exact en ETH. Fonds bloqués. Statut = Paid. |
| `acceptLeg(parcelId)` | Porteur | Vérifie que points ≥ price avant d'accepter. Statut = InTransit. |
| `confirmHandoff(parcelId, photoHash)` | Porteur sortant + Porteur entrant | Les deux doivent confirmer. Hop avance, points crédités, hash enregistré. |
| `confirmDelivery(parcelId)` | Destinataire | Libère 95% à l'expéditeur, 5% à la réserve. Statut = Delivered. |
| `openDispute(parcelId)` | Destinataire | Gèle les fonds. Statut = Disputed. |
| `resolveDispute(parcelId, faultyHop)` | Plateforme | Rembourse destinataire + expéditeur depuis la réserve. Pénalise le porteur fautif en points. |

#### Logique de paiement à la livraison

```solidity
function confirmDelivery(uint256 parcelId) external {
    Parcel storage p = parcels[parcelId];
    require(msg.sender == p.recipient, "Seul le destinataire peut confirmer");
    require(p.status == ParcelStatus.InTransit, "Statut invalide");

    p.status = ParcelStatus.Delivered;

    uint256 platformFee = p.price * 5 / 100;       //  5% → réserve plateforme
    uint256 senderAmount = p.price - platformFee;   // 95% → expéditeur

    platformReserve += platformFee;
    payable(p.sender).transfer(senderAmount);

    emit DeliveryConfirmed(parcelId, p.recipient);
    emit PaymentReleased(parcelId, p.sender, senderAmount, platformFee);
}
```

#### Logique de résolution de litige

```solidity
function resolveDispute(uint256 parcelId, uint8 faultyHop) external onlyOwner {
    Parcel storage p = parcels[parcelId];
    require(p.status == ParcelStatus.Disputed, "Pas en litige");

    p.status = ParcelStatus.Delivered;
    p.faultyHop = faultyHop;

    // 1. Remboursement intégral du destinataire (depuis les fonds bloqués)
    payable(p.recipient).transfer(p.price);

    // 2. Remboursement intégral de l'expéditeur (depuis la réserve plateforme)
    require(platformReserve >= p.price, "Reserve insuffisante");
    platformReserve -= p.price;
    payable(p.sender).transfer(p.price);

    // 3. Pénalité du porteur fautif : perd exactement "price" en points
    address faultyCarrier = p.carrierChain[faultyHop];
    reputation.deductPoints(faultyCarrier, p.price);

    emit DisputeResolved(parcelId, faultyCarrier, p.price);
}
```

#### Règle de vérification des points à l'acceptation

```solidity
function acceptLeg(uint256 parcelId) external {
    Parcel storage p = parcels[parcelId];
    require(p.status == ParcelStatus.Paid, "Colis non disponible");

    // Vérification : le porteur doit avoir au moins autant de points que la valeur du colis
    uint256 carrierPoints = reputation.getPoints(msg.sender);
    require(carrierPoints >= p.price, "Points insuffisants pour ce colis");

    p.carrierChain.push(msg.sender);
    p.status = ParcelStatus.InTransit;

    emit LegAccepted(parcelId, msg.sender, p.currentHop);
}
```

#### Événements

```solidity
event ParcelPosted(uint256 parcelId, address sender, uint256 price);
event ParcelPaid(uint256 parcelId, address recipient, uint256 amount);
event LegAccepted(uint256 parcelId, address carrier, uint8 hop);
event HandoffConfirmed(
    uint256 parcelId,
    address from,
    address to,
    bytes32 photoHash,
    uint256 timestamp
);
event DeliveryConfirmed(uint256 parcelId, address recipient);
event PaymentReleased(uint256 parcelId, address sender, uint256 senderAmount, uint256 platformFee);
event DisputeOpened(uint256 parcelId);
event DisputeResolved(uint256 parcelId, address faultyCarrier, uint256 pointsDeducted);
```

---

### 5.2 CarrierReputation.sol

Contrat autonome. Stocke les points, les niveaux et l'historique de chaque porteur on-chain. Personne ne peut modifier ces données directement — seul `RelayEscrow.sol` peut appeler les fonctions de mise à jour.

#### Variables d'état

```solidity
struct Carrier {
    uint256 points;            // solde de points actuel
    uint256 totalEarned;       // total de points gagnés depuis le début
    uint256 deliveryCount;     // nombre de livraisons réussies
    uint256 ratingSum;         // somme des notes reçues
    uint256 ratingCount;       // nombre de notes
    uint256 disputeCount;      // nombre de litiges où le porteur était fautif
    uint8 tier;                // 1 = Débutant, 2 = Vérifié, 3 = Expert
    bool isVerified;           // identité vérifiée
}

mapping(address => Carrier) public carriers;
address public relayContract;  // seul ce contrat peut appeler les fonctions sensibles
```

#### Fonctions principales

| Fonction | Appelée par | Description |
|---|---|---|
| `addPoints(porteur, amount)` | RelayEscrow | Crédite des points après livraison réussie. Met à jour le niveau. |
| `deductPoints(porteur, amount)` | RelayEscrow | Déduit exactement `amount` points en cas de faute. Incrémente disputeCount. |
| `getPoints(porteur)` | RelayEscrow + public | Retourne le solde de points actuel. |
| `submitRating(porteur, note)` | Destinataire | Soumet une note de 1 à 5 après livraison. |
| `getTier(porteur)` | Public | Retourne le niveau actuel (1/2/3). |
| `verifyCarrier(porteur)` | Owner uniquement | Marque le porteur comme ayant vérifié son identité. |

#### Logique de mise à jour des niveaux

```solidity
function _updateTier(address carrier) internal {
    Carrier storage c = carriers[carrier];
    uint256 avg = c.ratingCount > 0 ? c.ratingSum / c.ratingCount : 0;

    if (c.deliveryCount >= 50 && avg >= 45 && c.disputeCount == 0) {
        c.tier = 3;   // Expert
    } else if (c.deliveryCount >= 10 && avg >= 40 && c.isVerified) {
        c.tier = 2;   // Vérifié
    } else {
        c.tier = 1;   // Débutant
    }
}

function deductPoints(address carrier, uint256 amount) external onlyRelay {
    Carrier storage c = carriers[carrier];

    // Déduit exactement le montant — jamais en dessous de zéro
    if (c.points >= amount) {
        c.points -= amount;
    } else {
        c.points = 0;
    }

    c.disputeCount += 1;
    _updateTier(carrier);   // peut déclencher une rétrogradation

    emit PointsDeducted(carrier, amount, c.points, c.disputeCount);
}
```

---

## 6. Flux Complet — Étape par Étape

| N° | Acteur | Action | Effet on-chain |
|---|---|---|---|
| 1 | Expéditeur | `postParcel(recipient, 100 DT)` | Parcel créé, statut = Posted |
| 2 | Destinataire | `payForParcel(parcelId)` + 100 DT ETH | Prix bloqué dans le contrat, statut = Paid |
| 3 | Porteur A | `acceptLeg(parcelId)` — vérifié : points ≥ 100 | Porteur A inscrit dans carrierChain |
| 4 | Porteur A | Prend le colis, photographie, `confirmHandoff(hash)` | Première confirmation enregistrée |
| 5 | Porteur B | Rencontre Porteur A, photographie, `confirmHandoff(hash)` | Double confirmation → hop avance, points crédités à A, HandoffConfirmed émis |
| 6 | Porteur B | `acceptLeg()` pour tronçon 2 — vérifié : points ≥ 100 | Porteur B inscrit |
| 7 | Porteur B | Arrive chez le destinataire, `confirmHandoff(hash)` | Confirmation tronçon 2 |
| 8 | Destinataire | Inspecte le colis, `confirmDelivery()` | 95 DT → Expéditeur, 5 DT → Réserve, points → Porteurs |
| 9 | Destinataire | Soumet une note pour chaque porteur | Réputation mise à jour on-chain |

### 6.1 Scénario de litige — Colis perdu ou endommagé

```
1. Destinataire appelle openDispute(parcelId)
         ↓
   Tous les fonds gelés dans le contrat

2. Consultation du journal de hashes photo on-chain
         ↓
   Chaque tronçon a sa photo horodatée et immuable
   Comparaison visuelle → identification du tronçon fautif

3. Plateforme appelle resolveDispute(parcelId, faultyHop=1)
         ↓
   ├── 100 DT → Destinataire (depuis les fonds bloqués)
   ├── 100 DT → Expéditeur (depuis la réserve plateforme)
   └── Porteur B (hop 1) perd 100 points on-chain
       Porteur A (innocent) garde ses points
```

> Pas de parole contre parole : la chaîne de hashes photographiques constitue une preuve immuable. Le porteur fautif est identifié avec précision — les porteurs innocents ne sont pas pénalisés.

---

## 7. Interface — Application React

| Vue | Acteur | Actions principales |
|---|---|---|
| Marketplace | Destinataire | Parcourir les produits, commander, `payForParcel()` |
| Tableau de bord Expéditeur | Expéditeur | Publier un colis, suivre les tronçons, voir les paiements reçus |
| Tableau de bord Porteur | Porteur | Voir les colis disponibles (filtrés par points), `acceptLeg()`, `confirmHandoff()` |
| Tableau de bord Plateforme | Owner | Voir la réserve accumulée, résoudre les litiges |
| Journal d'audit public | Tout le monde | Interroger un parcelId → historique complet immuable |

### 7.1 Intégration MetaMask

```javascript
// Connexion au portefeuille
const provider = new ethers.BrowserProvider(window.ethereum);
const signer   = await provider.getSigner();
const relay    = new ethers.Contract(RELAY_ADDRESS, RELAY_ABI, signer);
const rep      = new ethers.Contract(REP_ADDRESS, REP_ABI, signer);

// Vérification des points avant d'afficher un colis comme disponible
const points = await rep.getPoints(walletAddress);
const parcel = await relay.parcels(parcelId);
const canAccept = points >= parcel.price;

// Destinataire paie le colis
const tx = await relay.payForParcel(parcelId, { value: parcel.price });
await tx.wait();

// Porteur accepte un tronçon
const tx2 = await relay.acceptLeg(parcelId);
await tx2.wait();

// Écoute de la libération des fonds
relay.on('PaymentReleased', (parcelId, sender, senderAmount, platformFee) => {
    afficherConfirmationPaiement(senderAmount, platformFee);
});

// Écoute d'une pénalité de points
rep.on('PointsDeducted', (carrier, amount, newBalance) => {
    afficherPenalite(carrier, amount, newBalance);
});
```

---

## 8. Déploiement et Plan de Tests

### 8.1 Environnement de développement

- **Ganache** — blockchain locale avec 10 comptes pré-financés
- **Remix IDE** — compilation initiale et tests rapides
- **Hardhat** — déploiement scripté et suite de tests automatisés
- **MetaMask** — connexion RPC Ganache (localhost:8545, Chain ID: 1337)

### 8.2 Script de déploiement

```javascript
// deploy.js (Hardhat)
const Reputation = await ethers.getContractFactory('CarrierReputation');
const reputation = await Reputation.deploy();
await reputation.waitForDeployment();

const Relay = await ethers.getContractFactory('RelayEscrow');
const relay = await Relay.deploy(reputation.target);
await relay.waitForDeployment();

// Autoriser RelayEscrow à appeler CarrierReputation
await reputation.setRelayContract(relay.target);

console.log('RelayEscrow     :', relay.target);
console.log('CarrierReputation:', reputation.target);
```

### 8.3 Scénarios de test

| Test | Résultat attendu | Critère de validation |
|---|---|---|
| Parcours nominal 2 tronçons | DeliveryConfirmed émis | 95 DT → expéditeur, 5 DT → réserve, points crédités aux porteurs |
| Porteur avec points insuffisants | `acceptLeg()` rejeté | Transaction revertée avec "Points insuffisants" |
| Colis perdu — litige | DisputeResolved émis | 100 DT → destinataire, 100 DT → expéditeur, porteur fautif -100 pts |
| Porteur innocent non pénalisé | Vérification points après litige | Seul le porteur fautif perd des points |
| Réserve insuffisante pour litige | `resolveDispute()` rejeté | Transaction revertée avec "Reserve insuffisante" |
| Accumulation réserve | 20 livraisons à 100 DT | `platformReserve == 100 DT` |
| Rétrogradation de niveau | Porteur avec disputeCount > 0 | `getTier()` retourne 1 si conditions non remplies |
| Appel non autorisé | Non-owner appelle `resolveDispute()` | Transaction revertée |

---

## 9. Script de Démonstration — Soutenance 15 minutes

**5 comptes MetaMask** : Expéditeur, Destinataire, Porteur A, Porteur B, Plateforme (owner)

| Temps | Étape | Compte | Ce qu'on montre |
|---|---|---|---|
| 0:00 | Problématique | — | COD incompatible blockchain → solution RelayChain |
| 2:00 | Architecture | — | Schéma des 2 contrats + flux des fonds |
| 3:30 | Publication | Expéditeur | `postParcel(100 DT)` on-chain |
| 5:00 | Paiement | Destinataire | `payForParcel()` — 100 DT bloqués visibles dans Ganache |
| 6:30 | Tronçon 1 | Porteur A | Vérification points ≥ 100 → `acceptLeg()` → `confirmHandoff()` |
| 8:00 | Transfert | Porteur B | `confirmHandoff()` → HandoffConfirmed visible on-chain |
| 9:30 | Livraison | Destinataire | `confirmDelivery()` → 95 DT expéditeur + 5 DT réserve dans Ganache |
| 11:00 | Audit | Vue publique | Historique complet du colis on-chain |
| 12:00 | Litige | Destinataire + Owner | `openDispute()` → `resolveDispute(faultyHop)` → points déduits on-chain |
| 14:00 | Q&R | — | Limites et perspectives |

---

## 10. Structure du Dépôt GitHub

```
relaychain/
├── contracts/
│   ├── RelayEscrow.sol            # Paiement, tronçons, réserve, litiges
│   └── CarrierReputation.sol      # Points, niveaux, pénalités
├── scripts/
│   └── deploy.js                  # Déploiement + liaison des deux contrats
├── test/
│   ├── relayEscrow.test.js        # Parcours nominal + litiges + réserve
│   └── reputation.test.js         # Points, pénalités, niveaux
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── Marketplace.jsx
│       ├── SenderDashboard.jsx
│       ├── CarrierDashboard.jsx   # Filtre les colis selon les points du porteur
│       ├── PlatformDashboard.jsx  # Réserve + résolution de litiges
│       └── AuditLog.jsx
├── hardhat.config.js
└── README.md
```

### README — Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Démarrer Ganache
ganache --deterministic

# 3. Déployer les contrats
npx hardhat run scripts/deploy.js --network localhost

# 4. Lancer les tests
npx hardhat test

# 5. Démarrer le frontend
cd frontend && npm install && npm start

# 6. Connecter MetaMask à localhost:8545 (Chain ID: 1337)
```

---

## 11. Conclusion et Perspectives

### 11.1 Apports de la Blockchain

- **Paiement sécurisé sans intermédiaire** — les fonds sont libérés automatiquement par le code à la confirmation de livraison
- **Réserve plateforme transparente** — les 5% s'accumulent on-chain, visibles par tous, et servent d'assurance réelle
- **Responsabilisation précise** — grâce à la chaîne de photos, seul le porteur fautif est pénalisé. Les innocents ne sont pas touchés
- **Pénalité proportionnelle et juste** — le porteur perd exactement la valeur du colis en points, jamais plus
- **Règle d'accès par les points** — un porteur ne peut pas prendre en charge un colis qu'il ne peut pas "couvrir" — le risque est maîtrisé avant même que le problème survienne
- **Réputation infalsifiable** — disputeCount, niveaux et points sont on-chain et ne peuvent être manipulés par personne

### 11.2 Limites du Prototype

- **Coûts en gas** — chaque transaction coûte de l'ETH. En production, Layer 2 (Polygon, Optimism) nécessaire
- **Volatilité de l'ETH** — un stablecoin (USDT, DAI) serait plus adapté pour des paiements du quotidien
- **Réserve insuffisante au démarrage** — les premiers litiges pourraient survenir avant que la réserve soit assez constituée. Une injection initiale de la plateforme serait nécessaire
- **Stockage des photos** — hashes simulés dans le prototype ; IPFS nécessaire en production
- **Résolution de litige manuelle** — l'admin identifie le tronçon fautif visuellement. En production, un oracle ou un système de vote communautaire serait plus décentralisé

### 11.3 Perspectives d'évolution

- **Stablecoin** — remplacer l'ETH par un stablecoin pour éliminer la volatilité des prix
- **Déploiement Polygon** — frais de gas quasi nuls, idéal pour les micro-transactions
- **Oracle de litiges** — remplacer la décision manuelle de l'admin par un vote communautaire des porteurs de niveau Expert
- **Token ERC-20 de points** — rendre les points échangeables sur la marketplace on-chain (non-transférables entre utilisateurs via ERC-5192)
- **Expansion multi-villes** — Casablanca, Alger, Le Caire — l'architecture est généralisable à toute ville dense avec un réseau de transport public

---

> *RelayChain transforme l'énergie latente des déplacements quotidiens d'une ville en un écosystème de livraison où chaque partie est équitablement protégée — le destinataire et l'expéditeur sont toujours couverts, et le porteur ne peut engager que ce qu'il est prêt à perdre.*

---
*Projet DApp Blockchain — Avril 2026 — Confidentiel*

---

## 12. Addendum v2.1 Robuste (version active)

> Cette section **remplace fonctionnellement** les sections 1 a 11 pour l'implementation.
> Les sections precedentes sont conservees ci-dessus comme historique v1.

### 12.1 Correctifs structurants integres

- **Machine d'etats corrigee** : `Posted -> Paid -> InTransit -> AwaitingNextCarrier -> Delivered`, avec branches `Disputed -> Refunded`.
- **Double confirmation robuste** : handshake en 2 phases avec acteurs explicitement autorises (sortant + entrant attendu).
- **Pas de finalisation ambigue** : livraison finale uniquement via `confirmDelivery()` par le destinataire.
- **Verrouillage anti sur-engagement** : points verrouilles par couple `(parcelId, carrier)` et non par simple adresse globale.
- **Timeouts deterministes** : handoff, attente nouveau porteur, litige owner.
- **Remboursement non bloquant** : reserve insuffisante => remboursement partiel + dette `pendingRefunds` reclamable plus tard.
- **Paiements securises** : `call` + checks-effects-interactions + `nonReentrant` (plus de `transfer`).
- **Compteur litiges mensuel realiste** : indexe par mois (`recipient`, `monthIndex`) au lieu d'un compteur cumulatif permanent.

### 12.2 Principes economiques v2.1

- Toutes les valeurs on-chain sont en **wei**.
- Les points sont en **wei-equivalent** pour garder `availablePoints >= price` sans oracle.
- `availablePoints = reputation.points(carrier) - totalLockedByCarrier(carrier)`.
- Onboarding porteur :
  - faucet initial apres verification KYC (ex: `10e18`),
  - ou seuil colis micro-valeur (`MIN_VALUE_NO_POINTS`) pour premiere livraison.

### 12.3 Machine d'etats v2.1

```text
Posted
  -> payForParcel() -> Paid
Paid
  -> acceptLeg(firstCarrier) -> InTransit
InTransit
  -> initiateHandoff(outgoing, expectedIncoming, hash) -> InTransit (pending)
InTransit
  -> acknowledgeHandoff(expectedIncoming, sameHash) -> AwaitingNextCarrier
AwaitingNextCarrier
  -> acceptLeg(nextCarrier) -> InTransit
AwaitingNextCarrier
  -> confirmDelivery() [recipient] -> Delivered

Branches de securite:
InTransit / AwaitingNextCarrier -> openDispute() -> Disputed -> resolveDispute() -> Refunded
InTransit / AwaitingNextCarrier / Disputed -> triggerTimeout() -> resolution automatique selon regles
```

### 12.4 Smart contract `RelayEscrow.sol` (spec v2.1)

#### Types et stockage

```solidity
enum ParcelStatus {
    Posted,
    Paid,
    InTransit,
    AwaitingNextCarrier,
    Delivered,
    Disputed,
    Refunded
}

struct Parcel {
    address sender;
    address recipient;
    uint256 price;                 // wei
    ParcelStatus status;
    address[] carrierChain;        // historique ordonne
    uint16 currentHop;
    bytes32[] photoHashes;
    uint256 createdAt;
    uint256 lastActionAt;
}

struct HandoffPending {
    address outgoingCarrier;
    address expectedIncoming;      // impose, pas libre
    bytes32 outgoingHash;
    bytes32 incomingHash;
    bool outgoingConfirmed;
    bool incomingConfirmed;
    uint256 deadline;
}

mapping(uint256 => Parcel) public parcels;
mapping(uint256 => HandoffPending) public pendingHandoffs;
mapping(uint256 => mapping(address => uint256)) public lockedByParcel; // parcelId => carrier => amount
mapping(address => uint256) public pendingRefunds;
mapping(address => mapping(uint256 => uint256)) public monthlyDisputeCount; // recipient => monthIndex => count

uint256 public platformReserve;
uint256 public parcelCount;
address public platformOwner;

uint256 constant HANDOFF_TIMEOUT = 2 hours;
uint256 constant NEXT_CARRIER_TIMEOUT = 24 hours;
uint256 constant DISPUTE_TIMEOUT = 30 days;
uint256 constant MIN_VALUE_NO_POINTS = 5e18;
uint256 constant MAX_DISPUTES_PER_MONTH = 3;
```

#### Fonctions cles

```solidity
function acceptLeg(uint256 parcelId) external nonReentrant {
    Parcel storage p = parcels[parcelId];
    require(
        p.status == ParcelStatus.Paid || p.status == ParcelStatus.AwaitingNextCarrier,
        "Statut invalide"
    );

    if (p.price >= MIN_VALUE_NO_POINTS) {
        uint256 total = reputation.getPoints(msg.sender);
        uint256 locked = _totalLockedByCarrier(msg.sender);
        require(total >= locked, "Incoherence points verrouilles");
        uint256 available = total - locked;
        require(available >= p.price, "Points insuffisants");
        lockedByParcel[parcelId][msg.sender] += p.price;
    }

    p.carrierChain.push(msg.sender);
    p.status = ParcelStatus.InTransit;
    p.lastActionAt = block.timestamp;
    emit LegAccepted(parcelId, msg.sender, uint16(p.carrierChain.length - 1));
}

function initiateHandoff(uint256 parcelId, address expectedIncoming, bytes32 photoHash) external {
    Parcel storage p = parcels[parcelId];
    require(p.status == ParcelStatus.InTransit, "Pas en transit");
    require(p.carrierChain.length > 0, "Aucun porteur");
    address outgoing = p.carrierChain[p.currentHop];
    require(msg.sender == outgoing, "Seul porteur sortant");
    require(expectedIncoming != address(0), "Incoming invalide");
    require(expectedIncoming != outgoing, "Incoming=outgoing interdit");

    HandoffPending storage h = pendingHandoffs[parcelId];
    require(!h.outgoingConfirmed && !h.incomingConfirmed, "Handoff deja en cours");

    h.outgoingCarrier = outgoing;
    h.expectedIncoming = expectedIncoming;
    h.outgoingHash = photoHash;
    h.outgoingConfirmed = true;
    h.deadline = block.timestamp + HANDOFF_TIMEOUT;
    p.lastActionAt = block.timestamp;
    emit HandoffInitiated(parcelId, outgoing, expectedIncoming, photoHash, h.deadline);
}

function acknowledgeHandoff(uint256 parcelId, bytes32 photoHash) external {
    Parcel storage p = parcels[parcelId];
    HandoffPending storage h = pendingHandoffs[parcelId];
    require(p.status == ParcelStatus.InTransit, "Pas en transit");
    require(h.outgoingConfirmed, "Aucune initiation");
    require(block.timestamp <= h.deadline, "Timeout handoff");
    require(msg.sender == h.expectedIncoming, "Incoming non autorise");
    require(!h.incomingConfirmed, "Incoming deja confirme");

    h.incomingHash = photoHash;
    h.incomingConfirmed = true;
    require(h.incomingHash == h.outgoingHash, "Hashes divergents");

    p.photoHashes.push(photoHash);
    p.currentHop += 1;

    address outgoing = h.outgoingCarrier;
    uint256 locked = lockedByParcel[parcelId][outgoing];
    if (locked > 0) {
        lockedByParcel[parcelId][outgoing] = 0;
    }

    reputation.addPoints(outgoing, p.price / 10);
    _clearPendingHandoff(parcelId);
    p.status = ParcelStatus.AwaitingNextCarrier;
    p.lastActionAt = block.timestamp;
    emit HandoffConfirmed(parcelId, outgoing, msg.sender, photoHash, block.timestamp);
}

function confirmDelivery(uint256 parcelId) external nonReentrant {
    Parcel storage p = parcels[parcelId];
    require(msg.sender == p.recipient, "Seul destinataire");
    require(p.status == ParcelStatus.AwaitingNextCarrier, "Statut invalide");

    p.status = ParcelStatus.Delivered;
    p.lastActionAt = block.timestamp;

    uint256 fee = (p.price * 5) / 100;
    uint256 senderAmount = p.price - fee;
    platformReserve += fee;

    (bool okSender, ) = payable(p.sender).call{value: senderAmount}("");
    require(okSender, "Paiement expéditeur echec");

    emit DeliveryConfirmed(parcelId, p.recipient);
    emit PaymentReleased(parcelId, p.sender, senderAmount, fee);
}
```

#### Litiges et solvabilite

```solidity
function openDispute(uint256 parcelId) external {
    Parcel storage p = parcels[parcelId];
    require(msg.sender == p.recipient, "Seul destinataire");
    require(
        p.status == ParcelStatus.InTransit || p.status == ParcelStatus.AwaitingNextCarrier,
        "Statut invalide"
    );

    uint256 monthIndex = block.timestamp / 30 days;
    uint256 n = monthlyDisputeCount[msg.sender][monthIndex];
    require(n < MAX_DISPUTES_PER_MONTH, "Limite mensuelle atteinte");
    monthlyDisputeCount[msg.sender][monthIndex] = n + 1;

    p.status = ParcelStatus.Disputed;
    p.lastActionAt = block.timestamp;
    emit DisputeOpened(parcelId, msg.sender);
}

function resolveDispute(uint256 parcelId, uint16 faultyHop) external onlyOwner nonReentrant {
    Parcel storage p = parcels[parcelId];
    require(p.status == ParcelStatus.Disputed, "Pas en litige");
    require(faultyHop < p.carrierChain.length, "Hop invalide");
    p.status = ParcelStatus.Refunded;
    p.lastActionAt = block.timestamp;

    // 1) Destinataire: remboursement depuis escrow du parcel
    (bool okRecipient, ) = payable(p.recipient).call{value: p.price}("");
    require(okRecipient, "Remboursement destinataire echec");

    // 2) Expediteur: reserve ou dette
    if (platformReserve >= p.price) {
        platformReserve -= p.price;
        (bool okSender, ) = payable(p.sender).call{value: p.price}("");
        require(okSender, "Remboursement expediteur echec");
    } else {
        uint256 partial = platformReserve;
        uint256 debt = p.price - partial;
        platformReserve = 0;
        pendingRefunds[p.sender] += debt;
        if (partial > 0) {
            (bool okPartial, ) = payable(p.sender).call{value: partial}("");
            require(okPartial, "Remboursement partiel echec");
        }
        emit PartialRefund(parcelId, p.sender, partial, debt);
    }

    // 3) Unlock exact par parcel
    for (uint16 i = 0; i < p.carrierChain.length; i++) {
        address c = p.carrierChain[i];
        if (lockedByParcel[parcelId][c] > 0) {
            lockedByParcel[parcelId][c] = 0;
        }
    }

    // 4) Slash fautif
    address faultyCarrier = p.carrierChain[faultyHop];
    reputation.deductPoints(faultyCarrier, p.price);
    emit DisputeResolved(parcelId, faultyCarrier, p.price);
}

function claimPendingRefund() external nonReentrant {
    uint256 amount = pendingRefunds[msg.sender];
    require(amount > 0, "Aucun remboursement en attente");
    require(platformReserve >= amount, "Reserve insuffisante");
    pendingRefunds[msg.sender] = 0;
    platformReserve -= amount;
    (bool ok, ) = payable(msg.sender).call{value: amount}("");
    require(ok, "Claim echec");
    emit RefundClaimed(msg.sender, amount);
}

function topUpReserve() external payable onlyOwner {
    require(msg.value > 0, "Montant nul");
    platformReserve += msg.value;
    emit ReserveToppedUp(msg.sender, msg.value, platformReserve);
}
```

#### Timeouts deterministes

```solidity
function triggerTimeout(uint256 parcelId) external nonReentrant {
    Parcel storage p = parcels[parcelId];
    uint256 elapsed = block.timestamp - p.lastActionAt;

    if (p.status == ParcelStatus.InTransit) {
        HandoffPending storage h = pendingHandoffs[parcelId];
        require(h.outgoingConfirmed, "Pas de handoff en attente");
        require(block.timestamp > h.deadline, "Timeout non atteint");

        // penalite legere du sortant pour no-show du handoff
        reputation.deductPoints(h.outgoingCarrier, p.price / 20);
        if (lockedByParcel[parcelId][h.outgoingCarrier] > 0) {
            lockedByParcel[parcelId][h.outgoingCarrier] = 0;
        }

        _clearPendingHandoff(parcelId);
        p.status = ParcelStatus.AwaitingNextCarrier;
        p.lastActionAt = block.timestamp;
        emit TimeoutTriggered(parcelId, "handoff", h.outgoingCarrier);
        return;
    }

    if (p.status == ParcelStatus.AwaitingNextCarrier) {
        require(elapsed > NEXT_CARRIER_TIMEOUT, "Timeout non atteint");
        p.status = ParcelStatus.Refunded;
        p.lastActionAt = block.timestamp;

        // priorite: proteger l'acheteur si livraison bloquee
        (bool okRecipient, ) = payable(p.recipient).call{value: p.price}("");
        require(okRecipient, "Refund destinataire echec");

        emit TimeoutTriggered(parcelId, "nextCarrier", address(0));
        return;
    }

    if (p.status == ParcelStatus.Disputed) {
        require(elapsed > DISPUTE_TIMEOUT, "Timeout non atteint");
        p.status = ParcelStatus.Refunded;
        p.lastActionAt = block.timestamp;

        // par defaut: remboursement destinataire + dette expediteur si reserve insuffisante
        (bool okRecipient, ) = payable(p.recipient).call{value: p.price}("");
        require(okRecipient, "Refund destinataire echec");

        if (platformReserve >= p.price) {
            platformReserve -= p.price;
            (bool okSender, ) = payable(p.sender).call{value: p.price}("");
            require(okSender, "Refund expediteur echec");
        } else {
            uint256 partial = platformReserve;
            uint256 debt = p.price - partial;
            platformReserve = 0;
            pendingRefunds[p.sender] += debt;
            if (partial > 0) {
                (bool okPartial, ) = payable(p.sender).call{value: partial}("");
                require(okPartial, "Refund partiel echec");
            }
            emit PartialRefund(parcelId, p.sender, partial, debt);
        }

        emit TimeoutTriggered(parcelId, "dispute", address(0));
        return;
    }

    revert("Aucun timeout applicable");
}
```

### 12.5 `CarrierReputation.sol` v2.1

```solidity
struct Carrier {
    uint256 points;
    uint256 totalEarned;
    uint256 deliveryCount;
    uint256 ratingSum;
    uint256 ratingCount;
    uint256 disputeCount;
    uint16 tier;
    bool isVerified;
}

mapping(address => Carrier) public carriers;
address public relayContract;

function addPoints(address carrier, uint256 amount) external onlyRelay {
    Carrier storage c = carriers[carrier];
    c.points += amount;
    c.totalEarned += amount;
    c.deliveryCount += 1;
    _updateTier(carrier);
    emit PointsAdded(carrier, amount, c.points);
}

function deductPoints(address carrier, uint256 amount) external onlyRelay {
    Carrier storage c = carriers[carrier];
    c.points = c.points >= amount ? c.points - amount : 0;
    c.disputeCount += 1;
    _updateTier(carrier);
    emit PointsDeducted(carrier, amount, c.points, c.disputeCount);
}

function onboardCarrier(address carrier) external onlyOwner {
    require(!carriers[carrier].isVerified, "Deja verifie");
    carriers[carrier].isVerified = true;
    carriers[carrier].points += 10e18;
    emit CarrierOnboarded(carrier, 10e18);
}
```

### 12.6 Evenements v2.1

```solidity
event HandoffInitiated(uint256 parcelId, address from, address expectedTo, bytes32 photoHash, uint256 deadline);
event HandoffConfirmed(uint256 parcelId, address from, address to, bytes32 photoHash, uint256 timestamp);
event DeliveryConfirmed(uint256 parcelId, address recipient);
event PaymentReleased(uint256 parcelId, address sender, uint256 senderAmount, uint256 platformFee);
event DisputeOpened(uint256 parcelId, address by);
event DisputeResolved(uint256 parcelId, address faultyCarrier, uint256 pointsDeducted);
event PartialRefund(uint256 parcelId, address sender, uint256 paidNow, uint256 debt);
event RefundClaimed(address user, uint256 amount);
event ReserveToppedUp(address owner, uint256 amount, uint256 newReserve);
event TimeoutTriggered(uint256 parcelId, string timeoutType, address penalized);
```

### 12.7 Frontend React v2.1 (impacts)

- Dashboard porteur affiche `pointsTotal`, `pointsVerrouilles` et `pointsDisponibles`.
- Handoff en 2 boutons: `initiateHandoff()` puis `acknowledgeHandoff()` (acteur entrant impose).
- Ecran owner ajoute `topUpReserve()` et visualisation des dettes `pendingRefunds`.
- Ecran audit distingue clairement `Delivered` vs `Refunded`.
- Ecran litiges montre compteur mensuel `monthlyDisputeCount(recipient, monthIndex)`.

### 12.8 Plan de tests v2.1 (minimum)

| Test | Attendu |
|---|---|
| Incoming non autorise sur handoff | Revert `Incoming non autorise` |
| Outgoing tente de confirmer 2 fois | Revert (pas de spoof possible) |
| Hash outgoing != hash incoming | Revert `Hashes divergents` |
| Double modele livraison impossible | Seule `confirmDelivery()` finalise |
| Carrier repete sur 2 hops meme parcel | Locks liberes correctement sans underflow |
| Timeout handoff | Penalite 5%, unlock sortant, statut `AwaitingNextCarrier` |
| Timeout dispute | Destinataire rembourse + expediteur reserve/dette |
| Reserve insuffisante | `PartialRefund` + `pendingRefunds` |
| `claimPendingRefund()` reserve alimentee | Dette soldee et transfert OK |
| Compteur litiges mois suivant | Reset naturel via `monthIndex` |
| Paiements ETH | `call` reussi + garde `nonReentrant` |

### 12.9 Limites connues (v2.1)

- Arbitrage humain encore present en v1 (owner), remplaceable par DAO en v2.
- Hash photo reste une preuve faible sans pipeline d'attestation forte (EIP-712 + metadonnees + IPFS pinning strict).
- Volatilite ETH persiste tant que stablecoin non integre.

### 12.10 Roadmap v2.2 recommandee

1. Preuve forte de handoff (signature EIP-712 des 2 parties + CID IPFS obligatoire).
2. Gouvernance litige par jurys de porteurs Expert (DAO).
3. Migration Layer 2 (Polygon/Optimism) + stablecoin.
4. Mecanisme anti-Sybil avance (soulbound identity score + device/risk signals).
