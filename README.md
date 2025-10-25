# Sree Mahaveer Seva Platform - React Native Mobile Apps

Modern mobile application suite for the Mahaveer Bhavan community, built with React Native and Supabase.

## 📱 Applications

### 1. Member App
Mobile application for community members to:
- Register and manage their profile with ID card generation
- Browse and register for events and trips with dynamic pricing
- Real-time WhatsApp-style messaging
- Instagram-like gallery feed with media uploads
- Make donations with integrated payment gateway
- View personal dashboard and activity history

### 2. Admin App
Administrative mobile application for:
- Member and admin management
- Event and trip creation with logistics planning
- QR code-based attendance tracking
- Gallery content moderation
- Financial reporting and analytics
- Dynamic form field configuration
- System audit logs
- Payment gateway settings

## 🏗️ Project Structure

```
mahaveer-bhavan/
├── member-app/           # React Native app for members
├── admin-app/            # React Native app for administrators
├── shared/               # Shared code and types
├── supabase/            # Backend (edge functions & migrations)
└── docs/                # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- React Native development environment
- iOS: Xcode (Mac only)
- Android: Android Studio
- Supabase account

### Installation

1. **Install Member App**
```bash
cd member-app
npm install
cd ios && pod install && cd ..  # iOS only
```

2. **Install Admin App**
```bash
cd admin-app
npm install
cd ios && pod install && cd ..  # iOS only
```

3. **Configure Environment**

Create `.env` in both apps:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

4. **Run the Apps**
```bash
# Member App
cd member-app && npm run android  # or npm run ios

# Admin App
cd admin-app && npm run android  # or npm run ios
```

## 🗄️ Database Setup

Apply migrations in `supabase/migrations/`:
- `20251025_create_audit_log.sql` - Admin action tracking
- `20251025_create_form_fields.sql` - Dynamic forms
- `20251025_rename_gallery_items.sql` - Gallery table update

## 🛠️ Tech Stack

- **React Native 0.73.2** - Mobile framework
- **NativeWind** - Tailwind for React Native
- **Supabase** - Backend (Auth, Database, Storage, Realtime)
- **React Navigation v6** - Navigation
- **AsyncStorage** - Local persistence

## 📚 Features

### Member App
- Digital ID card with QR code
- Event registration with dynamic pricing
- Real-time messaging
- Gallery with uploads
- Donation system

### Admin App
- Member & admin management
- Event logistics & attendance
- Gallery moderation
- Analytics & reports
- System configuration

## 📖 Documentation

See `/docs` for detailed documentation.

## 📄 License

MIT License - see LICENSE file

---

**Migration Note:** Restructured from React web app to React Native. Backend (Supabase) unchanged.
