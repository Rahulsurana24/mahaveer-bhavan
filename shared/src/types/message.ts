export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio' | 'document';
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participant_ids: string[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}
