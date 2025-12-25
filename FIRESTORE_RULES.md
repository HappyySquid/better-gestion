# Règles de sécurité Firestore

Pour que le système de rôles fonctionne, vous devez configurer les règles de sécurité Firestore.

## Configuration des règles

Allez dans la console Firebase > Firestore Database > Rules et ajoutez ces règles :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour la collection userRoles
    // Les utilisateurs authentifiés peuvent lire leur propre rôle
    match /userRoles/{email} {
      // Permettre la lecture si l'utilisateur est authentifié
      // et que l'email correspond à l'utilisateur connecté
      allow read: if request.auth != null && request.auth.token.email == email;
      
      // Permettre l'écriture uniquement aux administrateurs (optionnel)
      // Pour l'instant, on permet l'écriture aux utilisateurs authentifiés
      // Vous pouvez restreindre cela plus tard
      allow write: if request.auth != null;
    }
    
    // Ajoutez ici vos autres règles pour les autres collections
    // (parking, boulangerie, gestion-linge, etc.)
  }
}
```

## Alternative : Règles plus permissives pour le développement

Si vous êtes en développement et que vous voulez permettre l'accès à tous les utilisateurs authentifiés :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour la collection userRoles
    match /userRoles/{email} {
      // Permettre la lecture à tous les utilisateurs authentifiés
      allow read: if request.auth != null;
      
      // Permettre l'écriture à tous les utilisateurs authentifiés (pour le développement)
      allow write: if request.auth != null;
    }
    
    // Règles pour la collection appartements
    match /appartements/{appartementId} {
      // Permettre la lecture à tous les utilisateurs authentifiés
      allow read: if request.auth != null;
      
      // Permettre l'écriture à tous les utilisateurs authentifiés (pour le développement)
      allow write: if request.auth != null;
    }
    
    // Règles pour la collection menage
    match /menage/{menageId} {
      // Permettre la lecture à tous les utilisateurs authentifiés
      allow read: if request.auth != null;
      
      // Permettre l'écriture à tous les utilisateurs authentifiés (pour le développement)
      allow write: if request.auth != null;
    }
    
    // Vos autres règles...
  }
}
```

## Important

1. **Publiez les règles** après les avoir modifiées (bouton "Publier" en haut)
2. **Vérifiez que l'utilisateur est bien authentifié** avant d'essayer de lire le rôle
3. **L'email dans Firestore doit correspondre exactement** à l'email de l'utilisateur connecté

