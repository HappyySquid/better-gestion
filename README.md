# Better Gestion

Application full stack PWA Angular Firebase pour la gestion d'une résidence de tourisme.

## 🚀 Fonctionnalités

- ✅ Authentification Firebase (Email/Password)
- ✅ PWA (Progressive Web App)
- ✅ Interface moderne et responsive
- ✅ Guards de protection des routes
- 🔜 Gestion du linge
- 🔜 Gestion des parkings
- 🔜 Autres fonctionnalités de gestion

## 📋 Prérequis

- Node.js (version 20 ou supérieure)
- npm ou yarn
- Un projet Firebase configuré

## 🛠️ Installation

1. Clonez le projet ou naviguez dans le dossier :
```bash
cd better-gestion
```

2. Installez les dépendances :
```bash
npm install
```

## ⚙️ Configuration Firebase

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com/)

2. Activez l'authentification Email/Password dans Firebase :
   - Allez dans Authentication > Sign-in method
   - Activez "Email/Password"

3. Récupérez vos clés de configuration Firebase :
   - Allez dans Project Settings > General
   - Dans "Your apps", créez une nouvelle application Web si nécessaire
   - Copiez les clés de configuration

4. Configurez les fichiers d'environnement :
   - Ouvrez `src/environments/environment.ts`
   - Remplacez les valeurs `YOUR_*` par vos vraies clés Firebase :
   ```typescript
   export const environment = {
     production: false,
     firebase: {
       apiKey: "VOTRE_API_KEY",
       authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
       projectId: "VOTRE_PROJECT_ID",
       storageBucket: "VOTRE_PROJECT_ID.appspot.com",
       messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
       appId: "VOTRE_APP_ID"
     }
   };
   ```

   - Faites de même pour `src/environments/environment.prod.ts` pour la production

## 🏃 Démarrage

Lancez le serveur de développement :
```bash
ng serve
```

L'application sera accessible sur `http://localhost:4200/`

## 📱 Structure du projet

```
src/
├── app/
│   ├── auth/
│   │   └── components/
│   │       ├── login/          # Composant de connexion
│   │       ├── register/       # Composant d'inscription
│   │       └── auth-layout/    # Layout pour les pages d'authentification
│   ├── core/
│   │   ├── guards/
│   │   │   └── auth.guard.ts   # Guards de protection des routes
│   │   └── services/
│   │       └── auth.service.ts # Service d'authentification
│   ├── dashboard/               # Page principale après connexion
│   ├── app.component.ts
│   ├── app.routes.ts           # Configuration des routes
│   └── app.config.ts           # Configuration de l'application
├── environments/
│   ├── environment.ts          # Configuration dev
│   └── environment.prod.ts     # Configuration production
└── ...
```

## 🔐 Authentification

L'application utilise Firebase Authentication avec Email/Password.

### Routes protégées
- `/dashboard` - Nécessite une authentification (protégée par `authGuard`)
- `/auth/login` - Accessible uniquement si non connecté (protégée par `loginGuard`)
- `/auth/register` - Accessible uniquement si non connecté (protégée par `loginGuard`)

## 🏗️ Build pour la production

```bash
ng build --configuration production
```

Les fichiers seront générés dans le dossier `dist/better-gestion/`

## 📝 Prochaines étapes

- [ ] Implémenter la gestion du linge
- [ ] Implémenter la gestion des parkings
- [ ] Ajouter d'autres fonctionnalités de gestion
- [ ] Améliorer l'interface utilisateur
- [ ] Ajouter des tests unitaires et e2e

## 🤝 Contribution

Ce projet est en cours de développement. Les fonctionnalités seront ajoutées progressivement.

## 📄 Licence

Ce projet est privé et destiné à l'usage interne de la résidence de tourisme.
