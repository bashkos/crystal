# Crystal - Influencer UGC Platform

A comprehensive influencer marketplace platform that connects brands with content creators for user-generated content campaigns.

## 🚀 Features

### Core Platform
- **Multi-Role System**: Brands, Influencers, and Admin roles with specialized dashboards
- **Advanced Authentication**: OAuth (Google, LinkedIn, Instagram) + email/password
- **Role-Based Access Control**: Secure permissions and workflow management

### For Brands
- **Campaign Management**: Create and manage UGC campaigns
- **Influencer Discovery**: Search and filter influencers by niche, metrics, and demographics
- **Contract Management**: Automated contract generation and digital signatures
- **Payment Processing**: Escrow-based payment system with Stripe integration
- **Analytics Dashboard**: Campaign performance tracking and ROI analysis

### For Influencers
- **Profile Builder**: Comprehensive portfolio and metrics display
- **Campaign Discovery**: Browse and apply to relevant campaigns
- **Content Submission**: Upload and manage content deliverables
- **Application Tracking**: Monitor application status and communication
- **Earnings Dashboard**: Track payments and financial analytics

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Next.js API Routes with Prisma ORM
- **Database**: PostgreSQL with comprehensive schema
- **Authentication**: NextAuth.js with multiple OAuth providers
- **Payments**: Stripe Connect for escrow and marketplace payments
- **UI Components**: Radix UI with custom Tailwind styling

## 📁 Project Structure

```
crystal/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── dashboard/         # User dashboards
│   │   ├── api/               # API routes
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable components
│   │   ├── ui/               # Base UI components
│   │   ├── forms/            # Form components
│   │   ├── layouts/          # Layout components
│   │   └── providers/        # Context providers
│   ├── lib/                  # Utilities and configurations
│   │   ├── auth.ts           # NextAuth config
│   │   ├── db.ts             # Prisma client
│   │   └── utils.ts          # Helper functions
│   ├── types/                # TypeScript type definitions
│   └── prisma/               # Database schema and migrations
├── public/                   # Static assets
└── docs/                     # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd crystal
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env.local
   # Configure your environment variables
   ```

3. **Database setup**
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to see the application.

### Environment Variables

Key environment variables to configure in `.env.local`:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/crystal_db"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"

# Stripe
STRIPE_PUBLISHABLE_KEY="pk_test_your-key"
STRIPE_SECRET_KEY="sk_test_your-key"
```

## 📊 Database Schema

The platform uses a comprehensive PostgreSQL schema with:

- **Users & Profiles**: Multi-role user system with specialized profiles
- **Campaigns**: Campaign management with requirements and deliverables
- **Applications**: Application workflow with status tracking
- **Contracts**: Smart contract management with payment schedules
- **Payments**: Escrow-based payment processing
- **Reviews**: Multi-dimensional rating system
- **Messages**: In-app communication system

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:migrate      # Run migrations
npm run db:studio       # Open Prisma Studio

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking
```

## 🎯 Current Status

**Phase 1 Foundation - ✅ Complete**
- ✅ Next.js 14 + TypeScript setup
- ✅ Tailwind CSS UI framework
- ✅ Prisma + PostgreSQL configuration
- ✅ NextAuth.js authentication system
- ✅ Role-based user management
- ✅ Basic UI components library
- ✅ Authentication pages (login/signup)
- ✅ Dashboard layouts for brands and influencers

**Next Development Phases**
- 🔄 Campaign creation and management
- 📝 Application and contract workflows
- 💳 Payment processing integration
- 📊 Analytics and reporting
- 🔍 Advanced search and filtering

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

## 🆘 Support

For questions or support:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review the database schema in `/prisma/schema.prisma`