
export type MessageSenderType = 'user' | 'company';

export interface Conversation {
  id: number;
  idApplication: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: number;
  idConversation: number;
  senderType: MessageSenderType;
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export interface ConversationDetails extends Conversation {
  idUser: number;
  idCompany: number;
  idJob: number;
  jobName: string;
  applicantName: string;
  companyName: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
}

export interface CreateConversationDTO {
  idApplication: number;
}

export interface SendMessageDTO {
  content: string;
}

export interface MessageListResponse {
  conversationId: number;
  messages: Message[];
}
