# Configuration Firestore pour Better Gestion

## Étapes pour activer Firestore

1. **Accédez à la Console Firebase**
   - Allez sur [Firebase Console](https://console.firebase.google.com/)
   - Sélectionnez votre projet "better-gestion"

2. **Activez Firestore Database**
   - Dans le menu de gauche, cliquez sur "Firestore Database"
   - Cliquez sur "Créer une base de données"
   - Choisissez le mode de démarrage :
     - **Mode de production** : Recommandé pour la sécurité
     - **Mode de test** : Pour le développement (accès libre pendant 30 jours)
   - Sélectionnez une région (ex: europe-west)
   - Cliquez sur "Activer"

3. **Configurez les règles de sécurité** (si en mode production)
   - Allez dans l'onglet "Règles"
   - Remplacez les règles par défaut par :
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Seuls les utilisateurs authentifiés peuvent lire/écrire
       match /stock/{document=**} {
         allow read, write: if request.auth != null;
       }
       // Règles pour les parkings
       match /parking-clients/{document=**} {
         allow read, write: if request.auth != null;
       }
       // Règles pour la boulangerie
       match /boulangerie-commandes/{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
   - Cliquez sur "Publier"

4. **Structure de la base de données**

   La base de données sera automatiquement créée avec la structure suivante lors de la première utilisation :

   ```
   stock/
     ├── current/          (Document contenant le stock actuel)
     │   ├── drapsSimple: number
     │   ├── housseSimple: number
     │   ├── drapsDouble: number
     │   ├── housseDouble: number
     │   ├── taieOreiller: number
     │   ├── grandeServiette: number
     │   ├── petiteServiette: number
     │   └── updatedAt: timestamp
     │
     └── kits/            (Document contenant les kits disponibles)
         ├── kitSimple: number
         ├── kitDouble: number
         ├── kitServiette: number
         └── updatedAt: timestamp

   parking-clients/        (Collection des clients de parking)
     └── {clientId}/      (Document client)
         ├── nom: string
         ├── numAppartement?: string
         ├── plaqueImmatriculation: string
         ├── modeleVehicule?: string
         ├── paye: boolean
         ├── dateDebut: timestamp
         ├── dateFin?: timestamp
         ├── dateArrivee: timestamp
         ├── batiment: 'Cimes' | 'Vallon'
         ├── estReservation: boolean
         └── confirme?: boolean

   boulangerie-commandes/    (Collection des commandes boulangerie)
     └── {commandeId}/       (Document commande)
         ├── nomClient: string
         ├── numAppartement?: string
         ├── produits: array
         │   └── {produitId: string, quantite: number}
         ├── dateCommande: timestamp
         ├── paye: boolean
         ├── donneAuClient: boolean
         ├── dateCreation: timestamp
         └── total: number
   ```

5. **Initialisation automatique**

   Lors de la première connexion à la page "Gestion du Linge", le stock sera automatiquement initialisé à 0 pour tous les articles si aucun stock n'existe encore.

## Utilisation

Une fois Firestore activé, vous pouvez :
- Accéder à la page "Gestion du Linge" depuis le dashboard
- Le stock sera automatiquement initialisé lors du premier accès
- Commencer à ajouter du stock et créer des kits
- Accéder à la page "Gestion des Parkings" depuis le dashboard
- Gérer les clients et réservations pour les bâtiments Cimes et Vallon
- Accéder à la page "Gestion Boulangerie" depuis le dashboard
- Créer et gérer les commandes de boulangerie pour les clients

## Notes importantes

- Assurez-vous que l'authentification Email/Password est activée dans Firebase
- Les données sont stockées en temps réel et synchronisées automatiquement
- Tous les utilisateurs authentifiés peuvent modifier le stock (vous pouvez restreindre cela avec des règles plus strictes si nécessaire)

