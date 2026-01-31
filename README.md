# Periodic Test Peer Evaluation App

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-blue)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

A production-quality, login-based Progressive Web App (PWA) for MBBS periodic tests and **blinded peer evaluation**. Built with modern web technologies and designed for offline-first reliability.

## 👨‍⚕️ Project Lead

**Dr. Siddalingaiah H S**  
Professor, Department of Community Medicine  
Shridevi Institute of Medical Sciences and Research Hospital, Tumkur  
📧 [hssling@yahoo.com](mailto:hssling@yahoo.com) | 📱 8941087719

---

![Dashboard Preview](docs/images/dashboard-preview.png)

## ✨ Features

### For Students
- 📝 **Take Timed Tests** - MCQ (single/multi), short answer, and long answer questions
- 💾 **Autosave Drafts** - Never lose your work with automatic local + server saving
- 📱 **PWA Support** - Install on any device, works offline
- 👥 **Peer Evaluation** - Evaluate anonymized submissions from peers
- 📊 **View Results** - See your scores and feedback from evaluations

### For Faculty/Admin
- ➕ **Create Tests** - Rich test creation with multiple question types
- 📋 **Manage Users** - Import students via CSV, manage batches
- 🔄 **Allocation System** - Automatic, blinded peer assignment
- 📈 **Analytics Dashboard** - View test performance, score distributions
- 📢 **Announcements** - Send notifications to students

### Technical Features
- 🔐 **Role-Based Access** - Student, Faculty, Admin roles with RLS
- 🌐 **Offline-First** - IndexedDB caching, background sync
- 🔒 **Anti-Cheating** - Paste blocking, tab switch detection, watermarks
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Modern UI** - Glass morphism, gradients, smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/periodic-test-app.git
   cd periodic-test-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up the database**
   
   Run the migrations in your Supabase SQL editor:
   ```bash
   # In order:
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_rls_policies.sql
   supabase/migrations/003_functions.sql
   supabase/seed.sql  # Optional: for demo data
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   Visit [http://localhost:3000](http://localhost:3000)

### Demo Accounts (if using seed data)
- **Admin**: hssling@yahoo.com / password123
- **Student**: student1@example.com / password123

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard & management
│   ├── auth/              # Login, registration pages
│   ├── student/           # Student dashboard & test taking
│   └── layout.tsx         # Root layout
├── components/
│   ├── layout/            # Sidebars, navigation
│   ├── shared/            # Shared components
│   ├── student/           # Student-specific components
│   ├── test/              # Test-taking components
│   └── ui/                # Base UI components (shadcn/ui style)
├── lib/
│   ├── offline/           # IndexedDB, sync engine
│   └── supabase/          # Supabase client configuration
├── supabase/
│   ├── migrations/        # SQL migrations
│   └── seed.sql           # Demo data
├── docs/                   # Documentation
├── public/                 # Static assets, PWA manifest
└── types/                  # TypeScript types
```

## 🗄️ Database Schema

See [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for the complete ERD and table definitions.

Key tables:
- `profiles` - User profiles with roles
- `tests` - Test definitions
- `questions` - Test questions
- `attempts` - Student test attempts
- `responses` - Student answers
- `allocations` - Peer evaluation assignments
- `evaluations` - Peer evaluation scores

## 🔒 Security

- **Row Level Security (RLS)** - All tables protected with granular policies
- **Role-based Access** - Students can only access their own data
- **Blinded Evaluation** - Peers see only submission codes, not names
- **Audit Logging** - All actions logged for review
- **HTTPS Only** - Enforced in production

See [docs/RLS_POLICIES.md](docs/RLS_POLICIES.md) for policy details.

## 📱 PWA Features

The app is a fully installable PWA with:
- Service worker for offline support
- App manifest with icons
- Background sync for draft responses
- Push notifications (optional)

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Netlify

1. Push to GitHub
2. Import in Netlify
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables

## 📖 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [RLS Policies](docs/RLS_POLICIES.md)
- [Allocation Algorithm](docs/ALLOCATION_ALGORITHM.md)
- [Offline Sync Design](docs/OFFLINE_SYNC.md)

## 🛣️ Roadmap

- [ ] Real-time collaboration for admins
- [ ] Advanced analytics with charts
- [ ] Question bank with tagging
- [ ] Automated MCQ grading
- [ ] PDF export for results
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [TailwindCSS](https://tailwindcss.com/) - CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components inspiration
- [Radix UI](https://radix-ui.com/) - Accessible primitives

---

Built with ❤️ for medical education
