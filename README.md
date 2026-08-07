# 🚀 Deconstruct.ai

> **Understand any codebase visually, interactively, and intelligently.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fdeconstruct-ai&env=GEMINI_API_KEY,R2_ACCOUNT_ID,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_BUCKET&envDescription=Required%20environment%20variables&envLink=https%3A%2F%2Fgithub.com%2Fyour-username%2Fdeconstruct-ai%23setting-up-cloudflare-r2)

Deconstruct.ai is an AI-powered reverse engineering platform that transforms unfamiliar codebases into an interactive learning experience. Instead of spending hours navigating thousands of lines of legacy code, simply upload a project ZIP and let Deconstruct automatically analyze, visualize, and explain the architecture step by step.

The platform parses the project structure, identifies execution entry points, analyzes application flow using the **Google Gemini API**, and generates synchronized architectural diagrams, interactive presentations, and contextual quizzes—all alongside the actual source code.

---

# ✨ Features

## ⚡ Fast Project Ingestion

- Drag-and-drop project ZIP upload (up to **500MB** via Cloudflare R2)
- Automatic extraction using `adm-zip`
- Smart filtering of unnecessary directories:
  - `node_modules`
  - `.git`
  - `dist`
  - `build`
  - `.next`
  - other generated artifacts

---

## 🧠 AI-Powered Architecture Analysis

Generate a complete understanding of any codebase with Gemini.

- Project overview
- Folder hierarchy analysis
- Execution flow detection
- Entry point identification
- Module relationships
- Data flow explanation
- Component dependency mapping
- Predictable structured JSON outputs

---

## 💻 Dual-Panel Interactive Workspace

A synchronized learning environment.

### Left Panel

- VS Code–style file explorer
- Read-only Monaco Editor
- Syntax highlighting
- File navigation
- Line highlighting

### Right Panel

Interactive React slides explaining:

- Overall architecture
- Individual modules
- Function breakdowns
- Component relationships
- Business logic
- Data flow
- API interactions

---

## 🔄 Sync-to-Code Navigation

Every explanation is connected directly to the source.

Clicking a slide automatically:

- Opens the correct file
- Scrolls Monaco Editor
- Highlights the responsible lines
- Keeps explanation and code synchronized

---

## 🎓 AI-Generated Learning Quizzes

Improve understanding with automatically generated quizzes.

Features include:

- Multiple choice questions
- Architecture-based questions
- Code comprehension challenges
- Immediate feedback
- Concept reinforcement

---

# 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15 (App Router)** | Frontend & Backend Framework |
| **React 19** | User Interface |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | UI Components |
| **Monaco Editor** | VS Code Editing Experience |
| **Google Gemini API** | AI Architecture Analysis |
| **Cloudflare R2** | Object Storage (unlimited uploads) |
| **adm-zip** | ZIP Extraction |
| **TypeScript** | Type Safety |

---

# 📂 Project Workflow

```text
Project ZIP
      │
      ▼
 ZIP Extraction
      │
      ▼
 File Filtering
      │
      ▼
 Codebase Parsing
      │
      ▼
 Gemini Architecture Analysis
      │
      ▼
 Structured JSON
      │
      ├─────────────┐
      ▼             ▼
 Monaco Editor   Interactive Slides
      │             │
      └──────┬──────┘
             ▼
     Sync-to-Line Navigation
             │
             ▼
      Learning Quizzes
```

---

# 🚀 Getting Started

## Prerequisites

Before running the project, you'll need:

- Node.js 18+
- npm
- Google Gemini API Key
- Cloudflare R2 Account (for >4MB uploads)

Get your API key from:

https://aistudio.google.com/app/apikey

---

# 📦 Installation

## 1. Clone the repository

```bash
git clone https://github.com/your-username/deconstruct-ai.git

cd deconstruct-ai
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Configure environment variables

Create a file named:

```text
.env.local
```

Add:

```env
# Required: Google Gemini API
GEMINI_API_KEY=your_actual_api_key_here

# Required for >4MB uploads: Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET=your_bucket_name
R2_PUBLIC_URL=https://pub-xxx.r2.dev  # Optional: custom domain for public access
```

### Setting up Cloudflare R2

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **R2 Object Storage**
2. Create a bucket (e.g., `deconstruct-uploads`)
3. Go to **Manage R2 API Tokens** → Create API Token with **Object Read & Write** permissions
4. Copy the **Account ID**, **Access Key ID**, **Secret Access Key**
5. (Optional) Enable **Public Access** on the bucket and set a custom domain for `R2_PUBLIC_URL`

---

## 4. Run the development server

```bash
npm run dev
```

---

## 5. Open the application

Visit:

```
http://localhost:3000
```

---

# 📁 Recommended Project Structure

```text
deconstruct-ai/

├── app/
├── components/
├── lib/
├── services/
├── hooks/
├── utils/
├── public/
├── styles/
├── types/
├── .env.local
├── package.json
└── README.md
```

---

# 🗺 Development Sprint

## ✅ Week 1 — AI Processing Engine

- ZIP upload
- File extraction
- Ignore unnecessary folders
- Parse file structure
- Gemini prompt engineering
- JSON schema generation

---

## ✅ Week 2 — Interactive Workspace

- Monaco Editor
- File Explorer
- Slide presentation UI
- Architecture visualization
- Responsive layout

---

## ✅ Week 3 — Learning Experience

- Slide ↔ Code synchronization
- Line highlighting
- Navigation logic
- AI quiz generation
- Deployment

---

# 🎯 MVP Goals

- Upload any codebase
- Understand architecture instantly
- Navigate visually
- Learn module-by-module
- Reduce onboarding time
- Improve developer productivity

---

# 🔮 Future Roadmap

### GitHub Repository Import

Analyze repositories directly from GitHub URLs.

---

### Live Repository Sync

Automatically refresh analyses when repositories change.

---

### AST Visualization

Interactive Abstract Syntax Tree exploration for multiple languages.

---

### Dependency Graphs

Visualize imports, exports, and module relationships.

---

### Call Graph Explorer

Understand function execution paths across the application.

---

### AI Chat Assistant

Ask questions such as:

> "How does authentication work?"

> "Explain this API."

> "Where is this state updated?"

> "What calls this function?"

---

### Custom Monaco Themes

- Dark themes
- Light themes
- VS Code themes
- Custom syntax colors

---

### Multi-Language Support

Support for:

- JavaScript
- TypeScript
- Python
- Java
- Go
- Rust
- C++
- C#
- PHP

---

# 🤝 Contributing

Deconstruct.ai is currently in active MVP development.

Once the initial release is completed, external contributions will be welcomed.

Future contributors will be able to work on:

- New language parsers
- Improved AI prompts
- UI enhancements
- Performance optimizations
- Visualization tools
- Documentation

---

# 📄 License

This project is licensed under the **MIT License**.

See the `LICENSE` file for details.

---

# 💡 Why Deconstruct.ai?

Every developer has experienced the frustration of opening an unfamiliar repository and wondering:

- Where does the application start?
- Which files matter?
- How are modules connected?
- Where does the data flow?
- How do components communicate?

Deconstruct.ai answers these questions automatically, transforming complex codebases into an interactive learning experience that is visual, intuitive, and AI-powered.

---

## ⭐ If you find this project useful, consider giving it a star!

It helps support development and motivates future improvements.

**Built with ❤️ using Next.js, Monaco Editor, Tailwind CSS, shadcn/ui, Google Gemini AI, and Cloudflare R2.**

---

# 🚀 Deployment

## Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variables:
   - `GEMINI_API_KEY` (required)
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (for >4MB uploads)
   - `R2_PUBLIC_URL` (optional, for public asset URLs)
4. Deploy

### One-click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fdeconstruct-ai&env=GEMINI_API_KEY,R2_ACCOUNT_ID,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_BUCKET&envDescription=Required%20environment%20variables&envLink=https%3A%2F%2Fgithub.com%2Fyour-username%2Fdeconstruct-ai%23setting-up-cloudflare-r2)

## Other Platforms

The app works on any Node.js hosting (Railway, Render, Fly.io, etc.) - just set the same environment variables.
