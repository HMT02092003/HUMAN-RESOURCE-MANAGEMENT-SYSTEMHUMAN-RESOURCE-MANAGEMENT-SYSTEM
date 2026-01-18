/**
 * RabbitMQ Manager Type Definitions
 */

export interface QueueResult {
  success: boolean;
  mode: 'cloud' | 'local' | 'sync-fallback' | 'database_fallback';
  message?: string;
  taskId?: number;
}

export interface RabbitMQStatus {
  isConnected: boolean;
  mode: string;
  reconnectAttempts: number;
}

export interface RabbitMQManager {
  connection: any;
  channel: any;
  isConnected: boolean;
  mode: string;
  
  connect(): Promise<boolean>;
  sendToQueue(queueName: string, data: any, options?: any): Promise<QueueResult>;
  consumeQueue(queueName: string, handleMessage: (data: any) => Promise<void>): Promise<void>;
  close(): Promise<void>;
  getStatus(): RabbitMQStatus;
}

declare const rabbitmqManager: RabbitMQManager;
export default rabbitmqManager;
