markdown
# Jalnetra

Jalnetra consists of two interconnected applications that work together locally:
- **`command-center`**: Command center dashboard for monitoring and issuing alerts.
- **`civilian-app`**: Citizen-facing application for receiving alerts.

---

## Prerequisites & Installation

You need **Node.js `20.9` or newer** (which includes `npm`) and **`pnpm`**.

### 1. Install Node.js & npm
Download and install the LTS version from [nodejs.org](https://nodejs.org) (this installs both `node` and `npm`), or install via terminal:

- **macOS (Homebrew):**
  ```bash
  brew install node
  ```
- **Windows (winget):**
  ```bash
  winget install OpenJS.NodeJS.LTS
  ```

### 2. Install pnpm
Once Node.js and `npm` are installed, install `pnpm` globally:

```bash
npm install -g pnpm
```

Verify both installations:
```bash
node -v
npm -v
pnpm -v
```

---

## Run Both Apps Locally

Unzip both files over your old folders, then open **two terminals** and run the following commands.

### Terminal 1: Command Centre (Start First)

```bash
cd command-center
pnpm install
pnpm dev
```

Open [http://localhost:3000/command-centre](http://localhost:3000/command-centre)

### Terminal 2: Civilian App

```bash
cd civilian-app
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3001/citizen](http://localhost:3001/citizen)
