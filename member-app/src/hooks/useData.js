import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase/client';

/**
 * Data management hook for member app
 * Handles fetching and caching of events, donations, gallery, etc.
 *
 * @param {string} memberId - Current member's ID
 * @returns {Object} Data state and methods
 */
export const useData = (memberId) => {
  const [events, setEvents] = useState([]);
  const [trips, setTrips] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [donations, setDonations] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState({
    events: false,
    trips: false,
    registrations: false,
    donations: false,
    gallery: false,
  });
  const [error, setError] = useState({});

  /**
   * Fetch all events
   */
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, events: true }));
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'upcoming')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(prev => ({ ...prev, events: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, events: false }));
    }
  }, []);

  /**
   * Fetch all trips
   */
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, trips: true }));
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('status', 'upcoming')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTrips(data || []);
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError(prev => ({ ...prev, trips: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, trips: false }));
    }
  }, []);

  /**
   * Fetch member's registrations
   */
  const fetchMyRegistrations = useCallback(async () => {
    if (!memberId) return;

    try {
      setLoading(prev => ({ ...prev, registrations: true }));

      // Fetch event registrations
      const { data: eventRegs, error: eventError } = await supabase
        .from('event_registrations')
        .select(`
          *,
          events (*)
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (eventError) throw eventError;

      // Fetch trip registrations
      const { data: tripRegs, error: tripError } = await supabase
        .from('trip_registrations')
        .select(`
          *,
          trips (*)
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (tripError) throw tripError;

      setMyRegistrations([...(eventRegs || []), ...(tripRegs || [])]);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError(prev => ({ ...prev, registrations: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, registrations: false }));
    }
  }, [memberId]);

  /**
   * Fetch member's donations
   */
  const fetchDonations = useCallback(async () => {
    if (!memberId) return;

    try {
      setLoading(prev => ({ ...prev, donations: true }));
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (err) {
      console.error('Error fetching donations:', err);
      setError(prev => ({ ...prev, donations: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, donations: false }));
    }
  }, [memberId]);

  /**
   * Fetch approved gallery items
   */
  const fetchGallery = useCallback(async (page = 0, limit = 20) => {
    try {
      setLoading(prev => ({ ...prev, gallery: true }));
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      if (page === 0) {
        setGallery(data || []);
      } else {
        setGallery(prev => [...prev, ...(data || [])]);
      }
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setError(prev => ({ ...prev, gallery: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, gallery: false }));
    }
  }, []);

  /**
   * Register for an event
   */
  const registerForEvent = async (eventId, registrationData) => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          member_id: memberId,
          ...registrationData
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh registrations
      await fetchMyRegistrations();

      return { error: null, data };
    } catch (error) {
      console.error('Error registering for event:', error);
      return { error };
    }
  };

  /**
   * Submit a donation
   */
  const submitDonation = async (donationData) => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .insert({
          member_id: memberId,
          ...donationData
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh donations
      await fetchDonations();

      return { error: null, data };
    } catch (error) {
      console.error('Error submitting donation:', error);
      return { error };
    }
  };

  /**
   * Upload media to gallery (pending approval)
   */
  const uploadToGallery = async (mediaData) => {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .insert({
          uploader_id: memberId,
          is_approved: false,
          ...mediaData
        })
        .select()
        .single();

      if (error) throw error;
      return { error: null, data };
    } catch (error) {
      console.error('Error uploading to gallery:', error);
      return { error };
    }
  };

  // Load data on mount and when memberId changes
  useEffect(() => {
    fetchEvents();
    fetchTrips();
    fetchGallery();

    if (memberId) {
      fetchMyRegistrations();
      fetchDonations();
    }
  }, [memberId, fetchEvents, fetchTrips, fetchGallery, fetchMyRegistrations, fetchDonations]);

  return {
    events,
    trips,
    myRegistrations,
    donations,
    gallery,
    loading,
    error,
    // Methods
    refetchEvents: fetchEvents,
    refetchTrips: fetchTrips,
    refetchRegistrations: fetchMyRegistrations,
    refetchDonations: fetchDonations,
    refetchGallery: fetchGallery,
    registerForEvent,
    submitDonation,
    uploadToGallery,
  };
};
