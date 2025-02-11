# 💬 **Application de Chat Web (IRC)**

Une application web de chat (IRC), construite avec **Node.js**, **React.js**, **Express**, et **MongoDB**.

---

## 🚀 **Fonctionnalités**

- **Messagerie en temps réel**  
  - Communiquez instantanément dans des channels publics ou privés.  
  - Envoyez des fichiers, des images (png, jpg, gif) et des messages audio.  

- **Gestion des utilisateurs**  
  - Connectez-vous temporairement avec un pseudo.  
  - Inscrivez-vous avec un pseudo et un mot de passe pour une session permanente.  
  - Changez de pseudo à tout moment grâce à la commande `/nick`.  

- **Salles de chat**  
  - Rejoignez automatiquement le channel **Général** après votre connexion.  
  - Créez, supprimez, rejoignez ou quittez des channels personnalisés avec des commandes.  

- **Commandes interactives (RFC)**  
  - **`/list`** : Affiche tous les channels disponibles de l'utilisateur dans un panneau à droite.  
  - **`/users`** : Affiche la liste des utilisateurs présents dans le channel actuel dans un panneau à gauche.  
  - **`/msg`** : Permet d'envoyer un message privé à un utilisateur spécifique.  
  - **`/create`, `/delete`, `/join`, `/quit`** : Gère les channels.  
  - **`/nick`** : Change le pseudo de l'utilisateur (si le pseudo n'existe pas déjà).  

- **Historique des messages**  
  - Consultez les conversations précédentes dans vos channels.  

---

## 🛠️ **Technologies Utilisées**

- **Node.js** : Environnement d'exécution JavaScript côté serveur.  
- **Express** : Framework web minimaliste pour Node.js.  
- **React.js** : Bibliothèque front-end pour construire des interfaces utilisateur interactives.  
- **MongoDB** : Base de données NoSQL pour stocker les messages et les données des utilisateurs.  
- **Socket.IO** : Communication en temps réel pour les messages et les notifications.

---

## 📦 **Installation**

### **1. Cloner le dépôt**
```bash
git clone git@github.com:EpitechMscProPromo2027/T-JSF-600-TLS_3.git
cd T-JSF-600-TLS_3
```

### **2. Installer les dépendances du serveur**
```bash
cd api
npm install
```

### **3. Installer les dépendances du client**
```bash
cd ../client
npm install
```

---

## ▶️ **Utilisation**

### **1. Démarrer le serveur**
```bash
cd api
npm start
```

### **2. Démarrer le client**
```bash
cd ../client
npm start
```

### **3. Accéder à l'application**
Ouvrez votre navigateur et allez à **[http://localhost:3000](http://localhost:3000)** pour utiliser l'application.

---

## 🔥 **Commandes Disponibles**

| **Commande**            | **Description**                                                                                   |
|--------------------------|---------------------------------------------------------------------------------------------------|
| **`/list`**             | Affiche tous les channels disponibles de l'utilisateur dans un panneau à droite.                 |
| **`/users`**            | Affiche tous les utilisateurs connectés dans le channel actuel dans un panneau à gauche.         |
| **`/create <nom>`**     | Crée un nouveau channel avec le nom donné.                                                        |
| **`/delete <nom>`**     | Supprime un channel existant si l'utilisateur en a les permissions.                               |
| **`/join <nom>`**       | Rejoint le channel spécifié.                                                                      |
| **`/quit`**             | Quitte le channel actuel.                                                                         |
| **`/msg <utilisateur>`** | Envoie un message privé à l'utilisateur spécifié.                                                |
| **`/nick <nouveau_pseudo>`** | Change le pseudo de l'utilisateur (si le pseudo n'existe pas déjà).                          |

---

## 📚 **Documentation**

Consultez le document **RFC** dans l'onglet **Wiki** du dépôt pour une liste complète des commandes et spécifications.

---
