# Architecture Overview

## System Architecture

The Mahaveer Bhavan platform consists of two React Native mobile applications sharing a common Supabase backend.

```
┌─────────────────┐         ┌─────────────────┐
│   Member App    │         │    Admin App    │
│  (React Native) │         │  (React Native) │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │    ┌────────────────┐     │
         └────┤   Supabase     ├─────┘
              │   Backend      │
              └────────────────┘
                     │
       ┌─────────────┼─────────────┐
       │             │             │
   Database      Storage       Auth
  (PostgreSQL)   (S3-like)  (GoTrue)
```

## Application Structure

### Member App Architecture

```
member-app/
├── src/
│   ├── hooks/              # Custom React hooks for state management
│   │   ├── useAuth.js      # Authentication state & operations
│   │   ├── useData.js      # Data fetching & caching
│   │   └── useMessages.js  # Real-time messaging
│   │
│   ├── services/           # Backend integration layer
│   │   ├── supabase/
│   │   │   └── client.js   # Configured Supabase client
│   │   ├── api/
│   │   │   └── memberApi.js # Member-specific API calls
│   │   └── functions/
│   │       ├── media.js    # File uploads
│   │       └── idGenerator.js # Member ID generation
│   │
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Generic components (Button, Input, Card)
│   │   ├── profile/        # Profile-specific components
│   │   ├── events/         # Event components
│   │   ├── messages/       # Chat components
│   │   ├── gallery/        # Gallery components
│   │   └── donations/      # Donation components
│   │
│   ├── screens/            # Full-screen views
│   │   ├── Auth/           # Authentication screens
│   │   ├── Member/         # Member portal screens
│   │   └── navigation/     # Navigation configuration
│   │
│   ├── utils/              # Utility functions
│   │   ├── pdfGenerator.js
│   │   ├── qrCode.js
│   │   └── validation.js
│   │
│   └── constants/          # App constants
│       ├── colors.js
│       ├── theme.js
│       └── config.js
│
├── App.js                  # Root component
├── package.json
└── tailwind.config.js
```

### Admin App Architecture

Similar structure to Member App but with admin-specific features:
- Drawer navigation instead of bottom tabs
- Additional screens for management, analytics, moderation
- Extended permissions checking via `useAdminPermissions` hook

### Shared Module

```
shared/
├── src/
│   ├── types/              # TypeScript type definitions
│   │   ├── member.ts
│   │   ├── event.ts
│   │   ├── message.ts
│   │   ├── donation.ts
│   │   └── auth.ts
│   │
│   ├── constants/          # Shared constants
│   │   ├── membershipTypes.js
│   │   └── eventTypes.js
│   │
│   └── utils/              # Shared utilities
│       ├── dateHelpers.js
│       └── validators.js
```

## Data Flow

### Authentication Flow

```
┌────────────────┐
│  LoginScreen   │
└───────┬────────┘
        │ email, password
        ▼
┌────────────────┐
│   useAuth()    │  1. Call supabase.auth.signInWithPassword()
└───────┬────────┘  2. Store session in AsyncStorage
        │           3. Fetch user profile from members table
        ▼           4. Set auth state
┌────────────────┐
│   Supabase     │
│     Auth       │
└────────────────┘
```

### Data Fetching Flow

```
┌────────────────┐
│  EventScreen   │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│   useData()    │  1. Check cache (AsyncStorage)
└───────┬────────┘  2. If stale, fetch from Supabase
        │           3. Update cache
        │           4. Return data
        ▼
┌────────────────┐
│   Supabase     │
│   Database     │
└────────────────┘
```

### Real-time Messaging Flow

```
┌────────────────┐
│   ChatScreen   │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│  useMessages() │  1. Subscribe to conversation channel
└───────┬────────┘  2. Listen for INSERT events
        │           3. Optimistic UI update on send
        ▼           4. Real-time receive via subscription
┌────────────────┐
│   Supabase     │
│   Realtime     │
└────────────────┘
```

## Navigation Architecture

### Member App Navigation

```
RootNavigator (Conditional)
├── AuthNavigator (Stack) - If not authenticated
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── ChangePasswordScreen
│
└── MemberNavigator - If authenticated
    └── TabNavigator (Bottom Tabs)
        ├── HomeStack (Stack)
        │   └── DashboardHome
        ├── EventsStack (Stack)
        │   ├── EventListScreen
        │   ├── EventDetailScreen
        │   └── RegistrationScreen
        ├── MessagesStack (Stack)
        │   ├── ConversationsScreen
        │   └── ChatScreen
        ├── GalleryStack (Stack)
        │   ├── GalleryFeedScreen
        │   └── UploadScreen
        └── ProfileStack (Stack)
            ├── ProfileScreen
            └── IdCardView
```

### Admin App Navigation

```
RootNavigator (Conditional)
├── AdminAuthNavigator - If not authenticated
│   └── AdminLoginScreen
│
└── DrawerNavigator - If authenticated
    ├── Dashboard
    ├── User Management
    │   ├── Members
    │   └── Admins
    ├── Events
    │   ├── Event Management
    │   └── Trip Management
    ├── Tools
    │   └── Attendance Scanner
    ├── Gallery
    │   └── Moderation
    └── System
        ├── Form Manager
        ├── Audit Log
        └── Settings
```

## State Management

### Hook-Based State Management

Instead of Redux/MobX, we use custom hooks for state management:

**useAuth Hook:**
- Manages authentication state (user, session, profile)
- Provides auth operations (login, logout, register, updatePassword)
- Persists session to AsyncStorage
- Listens to auth state changes

**useData Hook:**
- Fetches and caches app data (events, trips, donations, gallery)
- Implements stale-while-revalidate pattern
- Provides CRUD operations
- Background refresh every 5 minutes

**useMessages Hook:**
- Manages real-time messaging state
- Subscribes to Supabase Realtime channels
- Optimistic UI updates
- Message queue for offline sends

### Benefits of Hook-Based Approach:
- No boilerplate
- Easy to test
- Composable
- Type-safe with TypeScript
- Direct integration with Supabase

## Security Architecture

### Row Level Security (RLS)

All database tables use Supabase RLS policies:

**Members Table:**
```sql
-- Members can only read/update their own data
CREATE POLICY "Members can view own data"
  ON members FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Members can update own data"
  ON members FOR UPDATE
  USING (auth.uid() = auth_id);
```

**Admin-Only Tables:**
```sql
-- Only admins can access audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

### API Security

- All API calls authenticated with JWT from Supabase Auth
- Edge functions validate user permissions server-side
- Sensitive operations logged to audit_log
- Payment processing via secure edge functions (never client-side)

### Storage Security

- Profile photos: Public read, authenticated write
- Gallery media: Approved items public, pending items restricted
- Message attachments: Only conversation participants can access

## Performance Optimizations

### Data Caching
- AsyncStorage for offline access
- In-memory cache in useData hook
- Stale-while-revalidate pattern (show cache, fetch fresh)

### Image Optimization
- react-native-fast-image for caching and performance
- Image compression before upload
- Lazy loading in gallery feed
- Thumbnail generation via edge functions

### Real-time Optimization
- Limit active subscriptions (max 3 concurrent)
- Unsubscribe when component unmounts
- Debounce typing indicators

### List Performance
- FlatList with pagination
- virtualization for long lists
- Optimized keyExtractor and renderItem

## Error Handling

### Global Error Boundary
```jsx
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```

### API Error Handling
```javascript
try {
  const { data, error } = await supabase.from('events').select();
  if (error) throw error;
  return { data, error: null };
} catch (error) {
  console.error('Error fetching events:', error);
  return { data: null, error };
}
```

### Network Error Handling
- Detect offline status with @react-native-community/netinfo
- Show offline banner
- Queue mutations for retry when back online
- Show cached data with staleness indicator

## Testing Strategy

### Unit Tests
- Test hooks in isolation using @testing-library/react-hooks
- Test utility functions
- Test data transformations

### Integration Tests
- Test navigation flows
- Test form submissions
- Test file uploads

### E2E Tests (Optional)
- Detox for React Native
- Test critical user flows

## Deployment Architecture

### Member App Deployment
- Bundle ID: com.mahaverbhavan.member
- iOS: App Store
- Android: Google Play Store
- OTA updates via CodePush (optional)

### Admin App Deployment
- Bundle ID: com.mahaverbhavan.admin
- Internal distribution or limited Play Store release
- More frequent updates than member app

### Backend Deployment
- Supabase Cloud (managed)
- Edge Functions deployed via Supabase CLI
- Database migrations applied via Supabase dashboard

## Monitoring & Analytics

### Application Monitoring
- Crash reporting (Sentry or similar)
- Performance monitoring
- User analytics (optional, privacy-compliant)

### Backend Monitoring
- Supabase dashboard for database metrics
- Edge function logs
- Storage usage tracking

### User Activity Tracking
- Audit log for admin actions
- Event registration tracking
- Donation tracking
