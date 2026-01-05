# WorkTimeTracker

A premium, modern, and intuitive work time tracking application built with React, Vite, and Electron. Designed for professionals who need to manage multiple projects and track their working hours with a beautiful, high-performance interface.

![App Icon](public/icon.png)

## ✨ Features

-   **Multi-Project Management**: Effortlessly switch between different clients or projects.
-   **Premium Bento Grid UI**: A clean, organized, and responsive layout for maximum productivity.
-   **Dynamic Progress Tracking**: Real-time visualization of your progress against monthly targets (min/max hours).
-   **Visual Trends**: Interactive bar charts to monitor your daily work distribution.
-   **Flexible Exporting**: Export your data to CSV (formatted for reporting) or JSON (for backups).
-   **Local Persistence**: All data is stored securely on your local machine using Electron's file system bridge.
-   **Modern Aesthetics**: Features glassmorphism effects and dynamic background animations.

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (mapped to current LTS recommended)
-   npm (comes with Node.js)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/bwrs-1/work-time-tracker.git
    cd work-time-tracker
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Development

Run the application in development mode with hot-reloading:
```bash
npm run electron:dev
```

### Build (Create EXE)

To package the application for Windows (generates a portable EXE in `dist-electron/`):
```bash
npm run electron:build
```

## 🛠 Tech Stack

-   **Frontend**: React, Vite
-   **Icons**: Lucide React
-   **Charts**: Recharts
-   **Desktop Wrapper**: Electron
-   **Styling**: Vanilla CSS (Custom Design System)

---

Developed with ❤️ by **Antigravity**
