# Mahaveer Bhavan Member Management System

A comprehensive web application for managing members, events, trips, and communications for the Mahaveer Bhavan community.

## Features

- **Member Management**: Complete profile system with photo uploads, emergency contacts, and membership types
- **Authentication**: Secure login system with role-based access control (Members, Admins, Superadmins)
- **Event Management**: Create and manage community events with registration and attendance tracking
- **Trip Management**: Organize trips with room assignments, seat allocations, and PNR tracking
- **Attendance System**: QR code-based attendance marking with manual lookup options
- **Gallery**: Instagram-style media gallery with posts, likes, comments, and follows
- **Messaging**: Enhanced messaging system with suggestions and read receipts
- **Calendar**: Community calendar with event scheduling
- **AI Chatbot**: Jainism knowledge base chatbot for community questions
- **Notifications**: In-app notification system for important updates
- **Financial Management**: Donation tracking and financial reporting
- **Reports & Analytics**: Comprehensive reporting dashboard for admins
- **Multi-language Support**: Hindi and English language options

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Icons**: Lucide React

### Backend & Database
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (Email/Password with JWT)
- **Storage**: Supabase Storage (Profile photos, gallery images)
- **Serverless Functions**: Supabase Edge Functions (Deno)
- **Real-time**: PostgreSQL RLS (Row Level Security)

### Deployment
- **Frontend Hosting**: Netlify
- **Database Hosting**: Supabase Cloud
- **Version Control**: Git/GitHub

## Prerequisites

- Node.js 18+ and npm
- Supabase account
- Netlify account (for deployment)

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/Rahulsurana24/mahaveer-bhavan.git
cd mahaveer-bhavan
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Database setup**

The database migrations are maintained locally. To set up your database:
- Access your Supabase project dashboard
- Navigate to SQL Editor
- Run the migrations in order from `supabase/migrations/`

5. **Start development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
mahaveer-bhavan/
├── src/
│   ├── components/         # Reusable React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── auth/          # Authentication components
│   │   ├── admin/         # Admin-specific components
│   │   ├── layout/        # Layout components
│   │   └── 3d/            # 3D animation components
│   ├── pages/             # Page components
│   │   ├── auth/          # Auth pages (login, signup, reset)
│   │   └── admin/         # Admin dashboard pages
│   ├── contexts/          # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # External service integrations
│   ├── locales/           # Language translation files
│   └── lib/               # Utility functions
├── supabase/
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations (local only)
└── public/                # Static assets
```

## Key Components

### Authentication System
- **Member Login**: Public login for community members
- **Admin Login**: Separate login portal for administrators
- **Password Reset**: Email-based password recovery
- **Role-Based Access**: Granular permissions (member, admin, superadmin, etc.)

### Database Schema
- **user_profiles**: User authentication and roles
- **members**: Detailed member information
- **events**: Community events
- **attendance_items & attendance_records**: Attendance tracking
- **gallery_posts**: Media gallery
- **messages**: Messaging system
- **notifications**: In-app notifications
- **trips**: Trip management

### Security Features
- Row Level Security (RLS) on all database tables
- SQL injection protection via parameterized queries
- XSS protection with React's built-in escaping
- CSRF protection with SameSite cookies
- bcrypt password hashing
- JWT-based session management
- HTTPS enforcement

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Functional React components with hooks
- Tailwind CSS for styling
- Mobile-first responsive design

## Deployment

### Frontend (Netlify)

1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables in Netlify dashboard
4. Deploy automatically on push to main branch

### Database (Supabase)

1. Create Supabase project
2. Run migrations via SQL Editor
3. Configure RLS policies
4. Set up storage buckets for images
5. Deploy Edge Functions via Supabase CLI

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
```bash
git clone https://github.com/YOUR_USERNAME/mahaveer-bhavan.git
```

2. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes**
- Follow the existing code style
- Write meaningful commit messages
- Test your changes thoroughly

4. **Commit your changes**
```bash
git add .
git commit -m "Add: brief description of your changes"
```

5. **Push to your fork**
```bash
git push origin feature/your-feature-name
```

6. **Create a Pull Request**
- Provide a clear description of changes
- Reference any related issues
- Ensure all checks pass

### Contribution Guidelines

- **Code Quality**: Write clean, maintainable TypeScript code
- **Testing**: Test all features before submitting
- **Documentation**: Update README if adding new features
- **Commits**: Use clear, descriptive commit messages
- **Issues**: Check existing issues before creating new ones

### Areas for Contribution

- Bug fixes and improvements
- New features and enhancements
- Documentation improvements
- UI/UX enhancements
- Performance optimizations
- Accessibility improvements
- Test coverage

## Support

For questions or issues:
- Create an issue on GitHub
- Contact the development team

## License

This project is proprietary software for Mahaveer Bhavan community use.

## Acknowledgments

Built with modern web technologies to serve the Mahaveer Bhavan community.
