export interface InputNotification {
  id: string;
  title: string
  type: string
  content: string
  content_type: string
  short_description: string
  template?: string
  status: 'pending'  | 'error' | 'sent'
  audience: string[]
} 

export interface DbNotification {
  id: string;
  title: string
  type: string
  content: string
  content_type: string
  short_description: string
  template?: string
  status: 'pending'  | 'error' | 'sent'
  audience: string
} 