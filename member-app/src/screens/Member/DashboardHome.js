import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import Card from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { colors } from '../../constants/colors';
import { formatDate } from '../../../shared/src/utils/dateHelpers';

/**
 * Dashboard Home Screen
 * Member's landing page with overview and quick actions
 */
const DashboardHome = ({ navigation }) => {
  const { profile, user } = useAuth();
  const {
    events,
    myRegistrations,
    donations,
    loading,
    refetchEvents,
    refetchRegistrations,
    refetchDonations,
  } = useData(profile?.id);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchEvents(),
      refetchRegistrations(),
      refetchDonations(),
    ]);
    setRefreshing(false);
  };

  if (loading.events && !events.length) {
    return <Loader fullScreen text="Loading dashboard..." />;
  }

  // Calculate statistics
  const totalDonations = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const upcomingEvents = events.filter(e => e.status === 'upcoming').length;
  const registeredEvents = myRegistrations.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with profile */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Avatar
            uri={profile?.photo_url}
            name={profile?.full_name}
            size="large"
          />
          <View style={styles.profileInfo}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.nameText}>{profile?.full_name || 'Member'}</Text>
            <Badge
              text={profile?.membership_type || 'Standard'}
              variant="info"
              style={styles.membershipBadge}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.idCardButton}
          onPress={() => navigation.navigate('IdCard')}
        >
          <Text style={styles.idCardButtonText}>View ID Card</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <Card variant="elevated" style={styles.statCard}>
          <Text style={styles.statValue}>{upcomingEvents}</Text>
          <Text style={styles.statLabel}>Upcoming Events</Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <Text style={styles.statValue}>{registeredEvents}</Text>
          <Text style={styles.statLabel}>Registered</Text>
        </Card>

        <Card variant="elevated" style={styles.statCard}>
          <Text style={styles.statValue}>₹{totalDonations}</Text>
          <Text style={styles.statLabel}>Total Donations</Text>
        </Card>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <Card
          variant="elevated"
          style={styles.actionCard}
          onPress={() => navigation.navigate('Events')}
        >
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionText}>Browse Events</Text>
        </Card>

        <Card
          variant="elevated"
          style={styles.actionCard}
          onPress={() => navigation.navigate('Messages')}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>Messages</Text>
        </Card>

        <Card
          variant="elevated"
          style={styles.actionCard}
          onPress={() => navigation.navigate('Gallery')}
        >
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionText}>Gallery</Text>
        </Card>

        <Card
          variant="elevated"
          style={styles.actionCard}
          onPress={() => navigation.navigate('Donations')}
        >
          <Text style={styles.actionIcon}>🙏</Text>
          <Text style={styles.actionText}>Donate</Text>
        </Card>
      </View>

      {/* Upcoming Events */}
      {events.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {events.slice(0, 3).map((event) => (
            <Card
              key={event.id}
              variant="elevated"
              onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
            >
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDate}>
                {formatDate(event.start_date)}
              </Text>
              <Text style={styles.eventLocation}>{event.location}</Text>
              {event.capacity && (
                <Badge
                  text={`${event.registered_count || 0}/${event.capacity} registered`}
                  variant={event.registered_count >= event.capacity ? 'danger' : 'success'}
                />
              )}
            </Card>
          ))}
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Events')}
          >
            <Text style={styles.viewAllText}>View All Events →</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  membershipBadge: {
    marginTop: 8,
  },
  idCardButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  idCardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    width: '48%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default DashboardHome;
