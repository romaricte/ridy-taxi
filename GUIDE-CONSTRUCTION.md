# 🚀 Guide de Construction - Ridy Taxi (depuis zéro)

## 📐 Architecture du Projet Original

Le projet **Ridy** est un monorepo **Nx** composé de 6 applications et 3 bibliothèques partagées :

```
ridy-taxi/
├── apps/
│   ├── admin-api/          # Backend NestJS — API d'administration (GraphQL)
│   ├── rider-api/          # Backend NestJS — API pour les passagers (GraphQL)
│   ├── driver-api/         # Backend NestJS — API pour les chauffeurs (GraphQL)
│   ├── admin-panel/        # Frontend Angular — Panel d'administration web
│   ├── rider-frontend/     # Flutter — App mobile passager
│   └── driver-frontend/    # Flutter — App mobile chauffeur
├── libs/
│   ├── database/           # Bibliothèque partagée — Entités TypeORM, services, enums
│   ├── flutter_common/     # Bibliothèque Flutter partagée — Widgets et services communs
│   └── flutter_localizations/  # Traductions partagées Flutter
├── .env                    # Variables d'environnement
├── docker-compose.yaml     # MySQL + Redis + APIs conteneurisées
├── package.json            # Dépendances du monorepo
├── nx.json                 # Configuration Nx
├── tsconfig.base.json      # Config TypeScript racine
└── tsconfig.json           # Config TypeScript projet
```

### Stack Technologique
| Couche | Technologie |
|--------|------------|
| Backend APIs | **NestJS** (Node.js) |
| API Protocol | **GraphQL** (Apollo Server) |
| Base de données | **MySQL 8.0** via **TypeORM** |
| Cache / Pub-Sub | **Redis** via **ioredis** |
| Admin Panel | **Angular** + **Ng-Zorro** (Ant Design) |
| Apps Mobiles | **Flutter** (Dart) |
| Auth | **JWT** (Passport.js) |
| Monorepo | **Nx Workspace** |
| Conteneurisation | **Docker Compose** |

---

## 🎯 Ordre de Construction (Phase par Phase)

### PHASE 1 : Fondations Backend (libs/database)
> C'est LE point de départ. Toutes les APIs dépendent de cette bibliothèque.

#### Étape 1.1 — Créer la structure de `libs/database`
```
libs/database/
├── package.json
├── tsconfig.json
├── tsconfig.lib.json
└── src/
    ├── index.ts                    # Exporte tout
    └── lib/
        ├── database.module.ts      # Module NestJS principal (connexion MySQL)
        ├── entities/               # Entités TypeORM
        │   ├── enums/              # Tous les enums (OrderStatus, DriverStatus, etc.)
        │   ├── fragments/          # Types embarqués (DeliveryContact, etc.)
        │   ├── taxi/               # Entités spécifiques au taxi
        │   │   ├── taxi-order.entity.ts
        │   │   ├── driver.entity.ts
        │   │   ├── service.entity.ts
        │   │   ├── region.entity.ts
        │   │   ├── fleet.entity.ts
        │   │   ├── feedback.entity.ts
        │   │   └── ... (42 fichiers)
        │   ├── customer.entity.ts
        │   ├── operator.entity.ts
        │   ├── media.entity.ts
        │   ├── payment-gateway.entity.ts
        │   └── ... (30 fichiers racine)
        ├── interfaces/             # Types TypeScript (Point, Waypoint, etc.)
        ├── transformers/           # Transformers TypeORM (multipoint, etc.)
        ├── migration/              # Migrations de base de données
        ├── redis/                  # Services Redis (cache, pub-sub driver positions)
        ├── sms/                    # Service d'envoi de SMS
        ├── geo/                    # Services géographiques (calcul distance, etc.)
        ├── order/                  # Logique métier des commandes (dispatcher)
        ├── crypto/                 # Chiffrement inter-APIs
        ├── storage/                # Service de stockage (local ou S3)
        ├── config/                 # Configuration dynamique
        ├── customer/               # Services client
        ├── customer-wallet/        # Wallet client
        ├── coupon/                 # Gestion des coupons
        ├── payment/                # Traitement des paiements
        └── interceptors/           # Intercepteurs NestJS
```

**📝 Ce qu'il faut faire :**
1. Créer `libs/database/package.json` (voir le projet original)
2. Créer `libs/database/tsconfig.json` et `tsconfig.lib.json`
3. Commencer par les **enums** (ce sont indépendants)
4. Créer les **interfaces** et **transformers**
5. Créer les **entités** une par une en commençant par celles sans dépendances :
   - `media.entity.ts` (base pour les uploads)
   - `operator.entity.ts` et `operator-role.entity.ts`
   - `customer.entity.ts`
   - `taxi/driver.entity.ts`
   - `taxi/service.entity.ts`
   - `taxi/region.entity.ts`
   - `taxi/taxi-order.entity.ts` (l'entité centrale)
6. Créer `database.module.ts` (connexion MySQL via TypeORM)

#### Étape 1.2 — Créer les Enums (64 fichiers)
Les enums les plus importants à créer en premier :
- `order-status.enum.ts` — États d'une course (Requested → Found → Arrived → Started → Finished)
- `driver-status.enum.ts` — États du chauffeur (Online, Offline, InService, etc.)
- `rider-status.enum.ts` — États du passager
- `payment-mode.enum.ts` — Modes de paiement (Cash, Wallet, PaymentGateway)
- `gender.enum.ts`
- `operator-permission.enum.ts` — Permissions admin
- `payment-gateway-type.enum.ts` — Types de passerelles

#### Étape 1.3 — Le Database Module
`database.module.ts` est le cœur :
- Se connecte à MySQL via TypeORM
- Lit la config depuis `.env` via `@nestjs/config`
- Crée automatiquement la base de données si elle n'existe pas
- Exécute les migrations au démarrage
- Synchronise le schéma en mode dev

---

### PHASE 2 : Première API — Admin API
> Une fois `libs/database` fonctionnelle, on construit la première API.

#### Étape 2.1 — Structure de `apps/admin-api`
```
apps/admin-api/
├── package.json
├── Dockerfile
├── webpack.config.js
├── tsconfig.app.json
├── .swcrc
└── src/
    ├── main.ts                 # Point d'entrée (bootstrap NestJS)
    ├── app/
    │   ├── admin-api.module.ts # Module principal
    │   ├── admin-api.controller.ts
    │   ├── auth/               # Authentification JWT
    │   ├── order/              # Gestion des courses
    │   ├── driver/             # Gestion des chauffeurs
    │   ├── customer/           # Gestion des clients
    │   ├── service/            # Types de services (économique, premium, etc.)
    │   ├── region/             # Zones géographiques
    │   ├── fleet/              # Gestion des flottes
    │   ├── config/             # Paramètres admin
    │   └── ... (34 modules au total)
    └── environments/
```

**📝 Ce qu'il faut faire :**
1. Créer `main.ts` — Bootstrap NestJS avec GraphQL Apollo Server
2. Créer `admin-api.module.ts` — Importe le DatabaseModule et tous les sous-modules
3. Créer le module `auth/` — Login admin avec JWT
4. Ajouter les modules métier un par un

#### Étape 2.2 — Configuration Webpack + SWC
L'API utilise **Webpack** pour le bundling et **SWC** (au lieu de ts-loader) pour la compilation rapide.

---

### PHASE 3 : APIs Rider et Driver
> Même structure que admin-api mais avec des modules spécifiques.

#### rider-api — Modules clés :
- `auth/` — Login par numéro de téléphone + SMS OTP
- `order/` — Créer une course, annuler, noter
- `chat/` — Messages avec le chauffeur (GraphQL Subscriptions)
- `address/` — Adresses sauvegardées
- `payment/` — Paiements (wallet, carte, cash)

#### driver-api — Modules clés :
- `auth/` — Login chauffeur
- `order/` — Accepter/refuser/terminer une course
- `driver/` — Mise à jour position GPS, statut en ligne
- `wallet/` — Consulter ses gains

---

### PHASE 4 : Admin Panel (Angular)
> L'interface d'administration web.

**📝 Ce qu'il faut faire :**
1. Créer un projet Angular avec Ng-Zorro
2. Configurer Apollo Angular pour se connecter à l'admin-api GraphQL
3. Créer les pages : Dashboard, Chauffeurs, Courses, Clients, Services, Régions, etc.

---

### PHASE 5 : Apps Flutter (Rider + Driver)
> Les applications mobiles.

**📝 Ce qu'il faut faire :**
1. Créer les projets Flutter
2. Configurer les dépendances (graphql_flutter, google_maps_flutter, etc.)
3. Implémenter les écrans
4. Se connecter aux APIs via GraphQL

---

## 💡 Conseils Importants

### 1. Commencer PETIT
Ne tentez pas de tout recréer d'un coup. L'ordre recommandé :
1. ✅ Faire fonctionner `libs/database` + MySQL (connexion, entités de base)
2. ✅ Faire fonctionner `admin-api` avec l'auth + un module simple
3. ✅ Tester que le GraphQL Playground fonctionne
4. Puis ajouter les modules un par un

### 2. Copier depuis l'original
Pour les fichiers de référence pure (enums, interfaces, entités), **copiez directement** depuis `ridy/`. Puis comprenez et adaptez.

### 3. Tester à chaque étape
Après chaque module ajouté :
```bash
npx nx serve admin-api  # Lancer l'API
```
Vérifiez que le serveur démarre sans erreur.

### 4. Docker d'abord
Avant toute chose, lancez MySQL et Redis :
```bash
docker-compose up -d mysql redis
```

---

## 🔧 Commandes Utiles

```bash
# Démarrer les services Docker
docker-compose up -d mysql redis

# Lancer une API en développement
npx nx serve admin-api
npx nx serve rider-api
npx nx serve driver-api

# Lancer le panel admin
npx nx serve admin-panel

# Installer les dépendances
npm install

# Générer un nouveau module NestJS
npx nest generate module <name> --project=admin-api

# Lancer les apps Flutter
cd apps/rider-frontend && flutter run
cd apps/driver-frontend && flutter run
```

---

## 📊 Estimation de Complexité

| Phase | Difficulté | Temps estimé |
|-------|-----------|-------------|
| Phase 1 : libs/database | ⭐⭐⭐ | 2-3 jours |
| Phase 2 : admin-api | ⭐⭐⭐⭐ | 3-5 jours |
| Phase 3 : rider + driver APIs | ⭐⭐⭐ | 2-3 jours |
| Phase 4 : admin-panel | ⭐⭐⭐⭐ | 4-6 jours |
| Phase 5 : apps Flutter | ⭐⭐⭐⭐⭐ | 5-10 jours |

**Total estimé : 2-4 semaines à temps plein**
