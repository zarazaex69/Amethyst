import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Subscription, SubscriptionData, NewCommitNotification } from '../types/subscription';
import { logger } from './logger';

export class SubscriptionService {
  private dataPath: string;
  private data: SubscriptionData;

  constructor() {
    this.dataPath = join(process.cwd(), 'data', 'subscriptions.json');
    this.data = {
      subscriptions: [],
      lastGlobalCheck: new Date().toISOString(),
    };
  }

  async initialize(): Promise<void> {
    try {
      // Создаем директорию data если её нет
      const dataDir = join(process.cwd(), 'data');
      if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
      }

      // Загружаем существующие данные
      if (existsSync(this.dataPath)) {
        const fileContent = await readFile(this.dataPath, 'utf-8');
        this.data = JSON.parse(fileContent);
        logger.info(`Loaded ${this.data.subscriptions.length} subscriptions`);
      } else {
        await this.saveData();
        logger.info('Created new subscriptions file');
      }
    } catch (error) {
      logger.error('Failed to initialize subscription service:', error);
      throw error;
    }
  }

  async subscribe(userId: number, username: string, repo?: string): Promise<Subscription> {
    const existingSubscription = this.data.subscriptions.find(
      sub => sub.userId === userId && sub.username === username && sub.repo === repo
    );

    if (existingSubscription) {
      if (existingSubscription.isActive) {
        throw new Error('Подписка уже активна');
      }
      existingSubscription.isActive = true;
      existingSubscription.lastCheckTime = new Date().toISOString();
    } else {
      const subscription: Subscription = {
        id: this.generateId(),
        userId,
        username,
        repo,
        lastCheckTime: new Date().toISOString(),
        isActive: true,
      };
      this.data.subscriptions.push(subscription);
    }

    await this.saveData();
    if (existingSubscription) {
      return existingSubscription;
    }
    const newSubscription = this.data.subscriptions[this.data.subscriptions.length - 1];
    if (!newSubscription) {
      throw new Error('Failed to create subscription');
    }
    return newSubscription;
  }

  async unsubscribe(userId: number, username: string, repo?: string): Promise<boolean> {
    const subscription = this.data.subscriptions.find(
      sub => sub.userId === userId && sub.username === username && sub.repo === repo
    );

    if (!subscription) {
      return false;
    }

    subscription.isActive = false;
    await this.saveData();
    return true;
  }

  async getUserSubscriptions(userId: number): Promise<Subscription[]> {
    return this.data.subscriptions.filter(sub => sub.userId === userId && sub.isActive);
  }

  async getAllActiveSubscriptions(): Promise<Subscription[]> {
    return this.data.subscriptions.filter(sub => sub.isActive);
  }

  async updateLastCommit(subscriptionId: string, commitSha: string): Promise<void> {
    const subscription = this.data.subscriptions.find(sub => sub.id === subscriptionId);
    if (subscription) {
      subscription.lastCommitSha = commitSha;
      subscription.lastCheckTime = new Date().toISOString();
      await this.saveData();
    }
  }

  async updateGlobalCheckTime(): Promise<void> {
    this.data.lastGlobalCheck = new Date().toISOString();
    await this.saveData();
  }

  getLastGlobalCheckTime(): string {
    return this.data.lastGlobalCheck;
  }

  private async saveData(): Promise<void> {
    try {
      await writeFile(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Failed to save subscription data:', error);
      throw error;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
