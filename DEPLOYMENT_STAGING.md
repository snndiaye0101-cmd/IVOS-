# 🚀 Guide de Déploiement STAGING - IVOS 61.1

## ✅ Pré-requis
- ✅ **0 erreurs TypeScript** (validé)
- ✅ Code source à jour
- ⚠️ Accès Supabase staging configuré
- ⚠️ Serveur staging accessible

---

## 📋 Checklist de Déploiement

### 1. Configuration Environnement

```bash
# Copier le fichier de configuration staging
cp .env.staging .env

# Éditer avec vos vraies clés
nano .env
```

**Variables critiques à configurer :**
- `VITE_SUPABASE_URL` : URL de votre projet Supabase staging
- `VITE_SUPABASE_ANON_KEY` : Clé publique Supabase
- `VITE_SENTRY_DSN` : DSN Sentry pour monitoring (optionnel)

### 2. Installation des Dépendances

```bash
npm install
```

### 3. Build de Production

```bash
# Build optimisé
npm run build

# Vérifier la taille du build
du -sh dist/
```

**Taille attendue :** ~2-3 MB (optimisé avec gzip)

### 4. Test en Local (Pre-deployment)

```bash
# Servir le build en local pour tester
npm run preview
```

Ouvrir `http://localhost:4173` et vérifier :
- ✅ Connexion fonctionnelle
- ✅ Création d'opération BSD
- ✅ Génération de facture
- ✅ Mode hors-ligne
- ✅ Pas d'erreurs console

### 5. Déploiement

#### Option A : Serveur avec SSH

```bash
# Copier le build vers le serveur
scp -r dist/* user@staging.ivos.sn:/var/www/ivos-staging/

# Ou via rsync (plus rapide)
rsync -avz --delete dist/ user@staging.ivos.sn:/var/www/ivos-staging/
```

#### Option B : Vercel/Netlify (Recommandé)

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel --prod

# Ou Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Option C : Docker

```bash
# Build image Docker
docker build -t ivos-staging:61.1 .

# Run container
docker run -d -p 8080:80 --name ivos-staging ivos-staging:61.1
```

### 6. Configuration Nginx (si serveur propre)

```nginx
server {
    listen 80;
    server_name staging.ivos.sn;
    
    root /var/www/ivos-staging;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Compression
    gzip on;
    gzip_types text/css application/javascript application/json;
    
    # Cache statique
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 7. Vérification Post-Déploiement

```bash
# Tester l'URL de staging
curl -I https://staging.ivos.sn

# Vérifier que l'app charge
curl https://staging.ivos.sn | grep "IVOS"
```

**Tests manuels critiques :**
1. ✅ Login avec compte test
2. ✅ Créer une opération complète (9 étapes)
3. ✅ Générer une facture
4. ✅ Exporter un PDF
5. ✅ Mode hors-ligne (désactiver réseau)
6. ✅ Auto-save fonctionne
7. ✅ Dashboard analytics affiche données

---

## 🔍 Monitoring Staging

### Sentry (Erreurs)
- Dashboard : https://sentry.io/organizations/ivos/projects/staging/
- Alertes configurées pour erreurs critiques

### Logs Navigateur
```javascript
// Activer logs détaillés en console staging
localStorage.setItem('ivos_debug', 'true');
```

### Métriques Clés
- **Temps de chargement** : < 3s
- **Taille bundle** : < 3 MB
- **Performance Lighthouse** : > 90

---

## 🐛 Debugging Staging

### Activer Mode Debug

```javascript
// En console navigateur
localStorage.setItem('ivos_debug', 'true');
window.location.reload();
```

### Logs Détaillés

```javascript
// Voir toutes les données stockées localement
console.log('Operations:', localStorage.getItem('ivos_operations_v1'));
console.log('Factures:', localStorage.getItem('ivos_workflow_invoices_v1'));
console.log('Auth:', localStorage.getItem('ivos_auth'));
```

### Réinitialiser l'État

```javascript
// ATTENTION : Efface toutes les données staging
Object.keys(localStorage)
  .filter(key => key.startsWith('ivos_'))
  .forEach(key => localStorage.removeItem(key));
window.location.reload();
```

---

## 📊 Tests à Effectuer en Staging

### Tests Fonctionnels

| Module | Test | Statut |
|--------|------|--------|
| **Auth** | Login/Logout | ⏳ |
| **BSD** | Créer opération complète | ⏳ |
| **Workflow** | 9 étapes complètes | ⏳ |
| **Facturation** | Génération auto facture | ⏳ |
| **PDF** | Export BSD + Facture | ⏳ |
| **Hors-ligne** | Mode offline + sync | ⏳ |
| **VGP** | Gestion engins manutention | ⏳ |
| **Analytics** | Dashboard données | ⏳ |

### Tests de Performance

```bash
# Lighthouse audit
npx lighthouse https://staging.ivos.sn --view

# Test charge
npx artillery quick --count 10 --num 100 https://staging.ivos.sn
```

---

## 🔄 Rollback (en cas de problème)

```bash
# Revenir à la version précédente
cd /var/www/ivos-staging
git checkout previous-version
npm run build
# Redéployer
```

---

## 📞 Support

**Problèmes connus :**
- ⚠️ Si "Cannot find module '@/..." → Vérifier tsconfig.json paths
- ⚠️ Si offline mode ne sync pas → Vérifier IndexedDB activé dans navigateur
- ⚠️ Si PDF vide → Vérifier import jspdf dans vite.config.ts

**Contact :**
- Tech Lead : tech@ivos.sn
- Documentation : `docs/` dans le repo

---

## ✅ Validation Finale

Après déploiement, demander à 3 utilisateurs test de :
1. Se connecter
2. Créer 1 opération complète
3. Générer 1 facture
4. Tester mode hors-ligne
5. Rapporter tout bug via Sentry ou email

**Critères de succès :**
- ✅ 0 erreur critique en 24h
- ✅ Toutes les fonctionnalités principales opérationnelles
- ✅ Performance > 80 sur Lighthouse
- ✅ Retours utilisateurs positifs

---

**Date déploiement :** ___________  
**Déployé par :** ___________  
**Version :** 61.1.0-staging
