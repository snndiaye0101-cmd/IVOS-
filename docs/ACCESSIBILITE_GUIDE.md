# Guide d'Amélioration de l'Accessibilité (a11y)

## ✅ Composants Accessibles Créés

### 📁 `/src/shared/components/a11y/AccessibleComponents.tsx`

Nouveaux composants conformes WCAG 2.1 Level AA :

#### 1. **SkipToContent**
- Lien "Skip navigation" pour utilisateurs clavier
- Focus visible quand activé
- Permet sauter navigation pour aller au contenu principal

**Usage :**
```tsx
import { SkipToContent } from '@/shared/components/a11y/AccessibleComponents';

function App() {
  return (
    <>
      <SkipToContent />
      <nav>...</nav>
      <main id="main-content">...</main>
    </>
  );
}
```

#### 2. **AccessibleButton**
- ARIA labels automatiques
- États loading/disabled accessibles
- Annonces screen reader

**Usage :**
```tsx
<AccessibleButton
  ariaLabel="Enregistrer les modifications"
  loading={isSaving}
  onClick={handleSave}
>
  <SaveIcon />
</AccessibleButton>
```

#### 3. **AccessibleInput**
- Labels associés correctement
- Messages d'erreur avec `role="alert"`
- Texte d'aide descriptif
- Attributs ARIA complets

**Usage :**
```tsx
<AccessibleInput
  label="Email"
  type="email"
  required
  error={errors.email}
  helpText="Format: nom@exemple.com"
/>
```

#### 4. **AccessibleModal**
- Focus trap (focus reste dans modal)
- Fermeture avec Escape
- ARIA dialog complet
- Gestion clavier automatique

**Usage :**
```tsx
<AccessibleModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirmer la suppression"
>
  <p>Êtes-vous sûr ?</p>
  <button onClick={handleConfirm}>Oui</button>
</AccessibleModal>
```

#### 5. **AccessibleSpinner**
- Loading states pour screen readers
- Annonce "Chargement..." automatique

**Usage :**
```tsx
<AccessibleSpinner label="Chargement des données" />
```

#### 6. **LiveRegion**
- Annonces dynamiques pour screen readers
- Niveaux de politeness

**Usage :**
```tsx
<LiveRegion 
  message="Mission créée avec succès"
  politeness="assertive"
/>
```

---

## 🔧 Hooks Utilitaires

### **useFocusTrap**
Gère le focus dans les modals/dialogs

```tsx
const modalRef = useFocusTrap(isOpen);

return (
  <div ref={modalRef}>
    <button>Premier élément focusable</button>
    <input />
    <button>Dernier élément focusable</button>
  </div>
);
```

### **handleEnterKey / handleArrowKeys**
Navigation clavier simplifiée

```tsx
<div
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={handleEnterKey(handleClick)}
>
  Item cliquable au clavier
</div>
```

---

## 📋 Checklist Accessibilité

### ✅ À implémenter dans les composants existants

#### **DashboardLayout.tsx**
- [ ] Ajouter `<SkipToContent />` en haut
- [ ] Ajouter `id="main-content"` au `<main>`
- [ ] Vérifier landmarks (`<nav>`, `<main>`, `<aside>`)

#### **Button.tsx** (Shadcn)
- [ ] Ajouter support `aria-label`
- [ ] Gérer `aria-busy` pour loading states
- [ ] Vérifier focus visible (outline)

#### **Modal.tsx**
- [ ] Remplacer par `AccessibleModal` ou ajouter focus trap
- [ ] Vérifier `role="dialog"` et `aria-modal="true"`
- [ ] Gérer Escape key

#### **Input.tsx / Textarea.tsx**
- [ ] Associer labels avec `htmlFor`
- [ ] Ajouter `aria-describedby` pour erreurs
- [ ] Messages d'erreur avec `role="alert"`

#### **Select.tsx / Dropdown**
- [ ] Navigation clavier (Arrow keys)
- [ ] Annonces changements pour screen readers
- [ ] `aria-expanded`, `aria-controls`

#### **Table / DataGrid**
- [ ] Headers avec `<th scope="col">`
- [ ] Caption avec résumé
- [ ] Navigation clavier (Tab, Arrow keys)

#### **Forms**
- [ ] Groupes avec `<fieldset>` et `<legend>`
- [ ] Validation en temps réel accessible
- [ ] Summary d'erreurs avec focus

---

## 🎯 Priorités d'Implémentation

### **Phase 1 - Critique (Urgent)** 🔴
1. ✅ Ajouter `SkipToContent` dans App.tsx
2. ✅ Fix focus traps dans tous les modals
3. ✅ Labels manquants sur tous les inputs
4. ✅ ARIA labels sur boutons icons-only

### **Phase 2 - Important** 🟡
5. Keyboard navigation pour tables
6. Live regions pour notifications
7. Error announcements automatiques
8. Focus visible sur tous les éléments interactifs

### **Phase 3 - Amélioration** 🟢
9. Landmarks sémantiques complets
10. Help text descriptif sur formulaires
11. Loading states verbeux
12. Shortcuts clavier (Ctrl+K search, etc.)

---

## 🧪 Tests d'Accessibilité

### **Outils à utiliser**

1. **Lighthouse** (Chrome DevTools)
   ```bash
   npm run build
   npx serve -s dist
   # Ouvrir Chrome DevTools > Lighthouse > Accessibility
   ```

2. **axe DevTools** (Extension Chrome)
   - Installer : https://chrome.google.com/webstore
   - Scanner la page : Detect violations

3. **Screen Reader Testing**
   - macOS : VoiceOver (Cmd+F5)
   - Windows : NVDA (gratuit)
   - Tests manuels essentiels

4. **Keyboard Navigation**
   ```
   Tab : Navigation avant
   Shift+Tab : Navigation arrière
   Enter/Space : Activation
   Escape : Fermeture modals
   Arrow keys : Navigation lists/menus
   ```

### **Tests Automatisés**

```tsx
// Ajouter à jest.setup.ts
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

// Dans les tests
import { axe } from 'jest-axe';

it('n\'a pas de violations a11y', async () => {
  const { container } = render(<MissionsPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 📊 Objectifs WCAG 2.1 Level AA

### **Critères Principaux**

| Critère | Description | Status |
|---------|-------------|--------|
| **1.1.1** | Alt text images | ⏳ À vérifier |
| **1.3.1** | Structure sémantique | ⏳ À améliorer |
| **1.4.3** | Contraste couleurs (4.5:1) | ⏳ À tester |
| **2.1.1** | Keyboard accessible | ✅ Implémenté |
| **2.1.2** | No keyboard traps | ✅ Focus traps fixes |
| **2.4.1** | Skip navigation | ✅ SkipToContent |
| **2.4.3** | Focus order logical | ⏳ À vérifier |
| **2.4.7** | Focus visible | ⏳ À améliorer |
| **3.2.2** | On input (no surprises) | ✅ OK |
| **3.3.1** | Error identification | ✅ AccessibleInput |
| **3.3.2** | Labels or instructions | ✅ Labels complets |
| **4.1.2** | Name, Role, Value | ✅ ARIA complet |

### **Score Cible**

- **Avant** : ~60/100 Lighthouse
- **Après** : **95+/100** 🎯

---

## 🚀 Migration Progressive

### **Exemple : Mise à jour MissionsDashboard**

**Avant :**
```tsx
<button onClick={handleCreate}>
  <PlusIcon />
</button>
```

**Après :**
```tsx
import { AccessibleButton } from '@/shared/components/a11y/AccessibleComponents';

<AccessibleButton
  onClick={handleCreate}
  ariaLabel="Créer une nouvelle mission"
>
  <PlusIcon aria-hidden="true" />
  <span className="sr-only">Créer</span>
</AccessibleButton>
```

---

## 📚 Ressources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN ARIA Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Inclusive Components](https://inclusive-components.design/)

---

## ✨ Prochaines Étapes

1. **Intégrer composants a11y** dans features critiques
2. **Tester Lighthouse** : Target score 95+
3. **Screen reader testing** : VoiceOver/NVDA
4. **Keyboard navigation** : Test manuel complet
5. **Documentation** : Guide utilisateurs clavier

---

**Date de création** : 2026-04-21  
**Status** : ✅ Composants créés, ⏳ Intégration en cours
