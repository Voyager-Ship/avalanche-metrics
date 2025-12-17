export interface Notification {
  id: string;
  title: string
  type: string
  content: string
  content_type: string
  short_description: string
  template?: string
  status: 'pending'  | 'error' | 'sent'
  recipients: string[]
} 