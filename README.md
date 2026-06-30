# 🚀 CodeRoom: High-Fidelity Collaborative Real-Time Workspace

[![GitHub license](https://img.shields.io/github/license/mashape/apistatus.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Vite](https://img.shields.io/badge/Vite-5.x-blueviolet?style=flat-square&logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.x-blue?style=flat-square&logo=react)](https://react.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black?style=flat-square&logo=socket.io)](https://socket.io/)

**CodeRoom** is a highly scalable, production-grade, multi-user development workspace featuring a real-time collaborative code editor, custom chats, active participant lists, and integrated execution terminals. 

This repository separates backend services from a robust **4-layer frontend architecture**, providing flawless state transitions, instant real-time synchronization, and automatic offline fallbacks.

---

## ✨ Features

- 👥 **Real-Time Multiplayer Editing**: Conflict-free simultaneous typing powered by an operational-transformation buffer.
- 💬 **Live Chat**: Discuss implementation, brainstorm ideas, and view workspace-level system logs in real-time.
- ⚡ **Collaborative Execution**: Share and execute draft code with instantaneous console output sync.
- 🛡️ **Stateless Authentication**: Fully protected routes using standard JWT and secure cryptographically hashed user tables.
- 💾 **Dual-Layer Database System**: Gracefully falls back to dynamic file system memory stores if remote MongoDB services are unconfigured.

---

## 🛠️ Architecture & Folder Structure

```text
├── backend/                    # BACKEND ARCHITECTURE (Node.js/Express/WebSockets)
│   ├── server.js               # Express application entry & socket connection layer
│   ├── serverAuth.js           # REST routers, authentication controllers, JWT guards
│   ├── serverModels.js         # Domain data layer, MongoDB schemas & memory cache fallbacks
│   └── dbConnect.js            # Dual-layer persistent storage manager (Mongoose + local backup fallbacks)
│
├── frontend/                   # FRONTEND ARCHITECTURE (React/Vite 4-Layer Design)
│   ├── shared/                 # [Layer 1] Shared Common Utilities & State
│   │   ├── store/              # Global Redux auth & room slice definitions
│   │   ├── hooks/              # Custom hook abstraction layers
│   │   ├── services/           # Axios REST configurations & WebSocket singletons
│   │   └── components/         # Highly stylized form inputs, buttons & modals
│   │
│   ├── features/               # [Layer 2] Modular Feature-Specific Sections
│   │   ├── auth/               # LoginPage feature component
│   │   ├── lobby/              # LobbyPage room management portal
│   │   └── editor/             # Multi-editor collaborative canvas
│   │
│   ├── layouts/                # [Layer 3] Persistent page wrapper components
│   │   └── MainLayout.jsx      # High-fidelity tech grid canvas wrapper
│   │
│   ├── routing/                # [Layer 4] AppRouter authentication check
│   │   └── AppRouter.jsx       # Route switcher
│   │
│   ├── App.jsx                 # Client entry-point router and URL query handler
│   ├── index.css               # Global theme & layout configuration (Tailwind CSS)
│   └── main.jsx                # DOM root initializer
│
├── package.json                # Project dependencies, dev tasks and build definitions
├── vite.config.js              # Vite config with compiler aliases and local dev settings
└── .env.example                # Template for server port, JWT secrets, and database URIs
```

---

## 💻 VS Code Setup (Local Machine)

Follow these steps to set up and run CodeRoom on your local VS Code environment:

### Prerequisite Checklist
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (Version 18.x or above recommended)
- [Git](https://git-scm.com/) (Optional, to push to GitHub)
- [VS Code](https://code.visualstudio.com/)

---

### Step 1: Open CodeRoom in VS Code
1. Open **VS Code**.
2. Go to **File > Open Folder...** and select the `NavotthanNew` directory (where your CodeRoom code is located).
3. Open a terminal in VS Code using the shortcut ``Ctrl + ` `` (Windows) or ``Cmd + ` `` (Mac).

### Step 2: Install Dependencies
Run the following command in the VS Code terminal to install all frontend and backend packages:
```bash
npm install
```

### Step 3: Configure Environment Variables
You need a `.env` file to securely run the server. CodeRoom provides a template `.env.example`.
1. Duplicate `.env.example` and rename it to `.env`:
   - **Windows PowerShell:**
     ```powershell
     copy .env.example .env
     ```
   - **Git Bash / macOS / Linux terminal:**
     ```bash
     cp .env.example .env
     ```
2. Open `.env` and fill in your values:
   ```env
   PORT=3000
   JWT_SECRET="your_custom_jwt_secret_here"
   MONGODB_URI="mongodb+srv://your_db_uri"   # Optional: falls back to local memory if left blank!
   ```

### Step 4: Run the Development Server
Launch the application with:
```bash
npm run dev
```
The server will start up on **`http://localhost:3000`** with live hot reloading enabled. Open this link in your browser to test your local workspace.

---

## 👥 How to Invite Friends (Sharing with ngrok)

If you are running the project on your local machine, your friends cannot access `localhost:3000` directly. You can use **ngrok** to create a secure, public tunnel so they can join your workspace.

### Fixing the ngrok Token Error (`ERR_NGROK_105`)
If you received the error `ERR_NGROK_105`, it means you tried running ngrok with a placeholder token (`YOUR_TOKEN`). You must set up a free ngrok account to acquire your unique authentication token.

#### Step 1: Get Your Free Authtoken
1. Go to [https://dashboard.ngrok.com](https://dashboard.ngrok.com) and sign up for a free account.
2. In the sidebar, navigate to **Getting Started > Your Authtoken**.
3. Copy your unique authtoken (it is a long alphanumeric string).

#### Step 2: Set the Authtoken in your Terminal
Depending on your terminal environment, configure your authtoken:

- **Windows (PowerShell - VS Code terminal)**:
  ```powershell
  ngrok config add-authtoken <YOUR_REAL_AUTHTOKEN_HERE>
  ```
- **macOS / Linux**:
  ```bash
  ./ngrok config add-authtoken <YOUR_REAL_AUTHTOKEN_HERE>
  ```

*This command saves your authtoken securely on your system.*

#### Step 3: Launch the Tunnel
Ensure your local Node server is running on port `3000` (`npm run dev`), then start ngrok:
```bash
ngrok http 3000
```

#### Step 4: Share with Friends!
Once ngrok starts successfully, it will display a screen with a **Forwarding Link**:
```text
Session Status: online
...
Forwarding: https://xxxx-xxx-xx-xxx.ngrok-free.app -> http://localhost:3000
```
1. **Copy the forwarding URL** (e.g., `https://xxxx-xxx-xx-xxx.ngrok-free.app`).
2. **Send this URL to your friends.** They can open it on their computers to join your live, multiplayer collaborative code workspace!

---

## 🛡️ Production Build & Deployment

To prepare CodeRoom for public hosting or cloud deployment (like AWS, Heroku, or GCP):

1. **Build Production Bundles**:
   ```bash
   npm run build
   ```
   This compiles optimized React static bundles and packages the Express backend server into a single high-speed server package (`dist/server.cjs`) using `esbuild`.

2. **Start Production Service**:
   ```bash
   npm start
   ```

---

## 🎨 Frontend Architecture Decoupled

The frontend is layered logically to ensure separation of concerns:
1. **Features & Presentation (`frontend/features/`, `frontend/shared/components/`)**: Handles pixel-perfect visual styling using Tailwind CSS.
2. **Business & State-Transition Layer (`frontend/shared/hooks/`)**: Glues UI layouts with data streams using unified custom hooks (`useRoom`, `useAuth`).
3. **Service Layer (`frontend/shared/services/`)**: Outlines lightweight APIs and persistent Socket singletons.
4. **Data Store (`frontend/shared/store/`)**: Synchronizes global state with Redux Toolkit.

---

*Made with 💻 and ☕ for collaborative hacking. Pull Requests are always welcome!*
