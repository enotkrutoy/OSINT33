import { Message, MessageRole, SessionState } from '../types';

/**
 * InMemorySessionService (Enhanced with LocalStorage)
 */
const STORAGE_KEY = 'crawl4ai_validator_sessions';

export interface SessionSummary {
  id: string;
  title: string;
  timestamp: number;
  preview: string;
}

class InMemorySessionService {
  private sessions: Map<string, Message[]> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.keys(parsed).forEach(key => {
          this.sessions.set(key, parsed[key]);
        });
      }
    } catch (e) {
      console.warn("Failed to load session history from localStorage", e);
    }
  }

  private saveToStorage() {
    try {
      const obj = Object.fromEntries(this.sessions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn("Failed to save session history to localStorage", e);
    }
  }

  public createSession(): string {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, []);
    this.saveToStorage();
    return sessionId;
  }

  public getHistory(sessionId: string): Message[] {
    return this.sessions.get(sessionId) || [];
  }

  public addMessage(sessionId: string, message: Message): void {
    const history = this.getHistory(sessionId);
    history.push(message);
    this.sessions.set(sessionId, history);
    this.saveToStorage();
  }

  public updateMessage(sessionId: string, messageId: string, newContent: string): void {
    const history = this.getHistory(sessionId);
    const index = history.findIndex(m => m.id === messageId);
    if (index !== -1) {
      history[index] = { ...history[index], content: newContent };
      this.sessions.set(sessionId, history);
      this.saveToStorage();
    }
  }

  // Удаляет сообщения, начиная с указанного ID (включительно или эксклюзивно)
  public truncateHistory(sessionId: string, startMessageId: string, inclusive: boolean = true): void {
    const history = this.getHistory(sessionId);
    const index = history.findIndex(m => m.id === startMessageId);
    
    if (index !== -1) {
      // Если inclusive = true, удаляем само сообщение и всё после него
      // Если inclusive = false, удаляем всё ПОСЛЕ сообщения
      const newHistory = inclusive ? history.slice(0, index) : history.slice(0, index + 1);
      this.sessions.set(sessionId, newHistory);
      this.saveToStorage();
    }
  }

  public clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.saveToStorage();
  }

  public getSessionsSummary(): SessionSummary[] {
    const summaries: SessionSummary[] = [];
    this.sessions.forEach((messages, id) => {
      // Find first user message for title
      const userMsg = messages.find(m => m.role === MessageRole.USER);
      const title = userMsg ? userMsg.content.slice(0, 40) + (userMsg.content.length > 40 ? '...' : '') : 'New Session';
      const lastMsg = messages[messages.length - 1];
      
      summaries.push({
        id,
        title,
        timestamp: lastMsg ? lastMsg.timestamp : Date.now(),
        preview: lastMsg ? lastMsg.content.slice(0, 60) : ''
      });
    });
    return summaries.sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const sessionService = new InMemorySessionService();