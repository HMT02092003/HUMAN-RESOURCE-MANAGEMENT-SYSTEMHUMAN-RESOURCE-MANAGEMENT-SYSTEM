/**
 * ====================================================================
 * RabbitMQ Connection Manager với Auto Fallback
 * ====================================================================
 * 
 * Tự động thử kết nối theo thứ tự:
 * 1. CloudAMQP (nếu có cấu hình)
 * 2. RabbitMQ Local (Docker hoặc localhost)
 * 3. Sync Fallback mode (xử lý đồng bộ)
 */

import amqp from 'amqplib';

class RabbitMQManager {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.mode = 'none';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 5000;
  }

  /**
   * Lấy danh sách RabbitMQ URLs theo thứ tự ưu tiên
   */
  getConnectionURLs() {
    const urls = [];
    
    // 1. CloudAMQP (Ưu tiên cao nhất)
    if (process.env.CLOUDAMQP_URL) {
      urls.push({
        url: process.env.CLOUDAMQP_URL,
        mode: 'cloud',
        name: 'CloudAMQP'
      });
    }

    // 2. Local RabbitMQ
    if (process.env.RABBITMQ_URL) {
      urls.push({
        url: process.env.RABBITMQ_URL,
        mode: 'local',
        name: 'Local RabbitMQ'
      });
    }

    // 3. Default localhost
    urls.push({
      url: 'amqp://guest:guest@localhost:5672',
      mode: 'local',
      name: 'Default localhost'
    });

    return urls;
  }

  /**
   * Kết nối đến RabbitMQ với auto fallback
   */
  async connect() {
    const urls = this.getConnectionURLs();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🐰 Đang kết nối RabbitMQ...                           ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    if (urls.length === 0) {
      console.log('\n⚠️  Không có RabbitMQ config - chuyển sang SYNC mode');
      this.mode = 'sync-fallback';
      this.isConnected = false;
      return false;
    }

    // Thử kết nối lần lượt
    for (const config of urls) {
      try {
        console.log(`\n⏳ Đang thử kết nối: ${config.name}...`);
        
        this.connection = await amqp.connect(config.url, {
          heartbeat: 60,
          timeout: 10000
        });
        
        this.channel = await this.connection.createChannel();
        this.isConnected = true;
        this.mode = config.mode;
        this.reconnectAttempts = 0;

        console.log(`✅ Kết nối thành công: ${config.name}`);
        console.log(`📡 Mode: ${this.mode.toUpperCase()}`);

        this.setupEventListeners();
        await this.setupQueues();

        return true;

      } catch (error) {
        console.log(`❌ Lỗi kết nối ${config.name}: ${error.message}`);
      }
    }

    // Sync Fallback mode
    console.log('\n⚠️  Không thể kết nối RabbitMQ!');
    console.log('🔄 Chuyển sang SYNC FALLBACK MODE');
    this.mode = 'sync-fallback';
    this.isConnected = false;
    
    return false;
  }

  /**
   * Setup các queues cần thiết
   */
  async setupQueues() {
    if (!this.channel) return;

    const queues = [
      'cv_analysis_queue',
      'salary_calculation_queue'
    ];

    for (const queue of queues) {
      await this.channel.assertQueue(queue, {
        durable: true,
        maxPriority: 10
      });
      console.log(`📋 Queue ready: ${queue}`);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.connection) return;

    this.connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err.message);
      this.isConnected = false;
      this.attemptReconnect();
    });

    this.connection.on('close', () => {
      console.log('🔌 RabbitMQ connection closed');
      this.isConnected = false;
      this.attemptReconnect();
    });
  }

  /**
   * Thử kết nối lại
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('⚠️  Chuyển sang fallback mode');
      this.mode = 'fallback';
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Thử kết nối lại (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(async () => {
      await this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Gửi message vào queue
   */
  async sendToQueue(queueName, data, options = {}) {
    if (this.mode === 'sync-fallback' || !this.isConnected || !this.channel) {
      console.log('⚠️  Sync Fallback: Sẽ xử lý đồng bộ');
      return { 
        success: true, 
        mode: 'sync-fallback',
        message: 'RabbitMQ không khả dụng'
      };
    }

    try {
      const message = Buffer.from(JSON.stringify(data));
      const sent = this.channel.sendToQueue(queueName, message, {
        persistent: true,
        priority: options.priority || 5,
        ...options
      });

      if (sent) {
        console.log(`✅ Đã gửi message vào queue: ${queueName}`);
        return { success: true, mode: this.mode };
      } else {
        throw new Error('Channel buffer full');
      }

    } catch (error) {
      console.error(`❌ Lỗi gửi message: ${error.message}`);
      return { 
        success: true, 
        mode: 'sync-fallback',
        message: 'Lỗi RabbitMQ'
      };
    }
  }

  /**
   * Nhận message từ queue (cho Worker)
   */
  async consumeQueue(queueName, handleMessage) {
    if (!this.channel) {
      console.log('⚠️  Không có kết nối RabbitMQ, bỏ qua consume');
      return;
    }

    try {
      await this.channel.prefetch(1);
      
      console.log(`👂 Đang lắng nghe queue: ${queueName}`);

      this.channel.consume(queueName, async (msg) => {
        if (!msg) return;

        try {
          const data = JSON.parse(msg.content.toString());
          console.log(`📥 Nhận message từ ${queueName}:`, data);

          await handleMessage(data);

          this.channel.ack(msg);
          console.log('✅ Message đã xử lý thành công');

        } catch (error) {
          console.error('❌ Lỗi xử lý message:', error.message);
          
          const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
          
          if (retryCount < 3) {
            console.log(`🔄 Retry lần ${retryCount}...`);
            this.channel.sendToQueue(queueName, msg.content, {
              headers: { 'x-retry-count': retryCount },
              persistent: true
            });
            this.channel.ack(msg);
          } else {
            console.log('❌ Đã retry quá 3 lần');
            this.channel.nack(msg, false, false);
          }
        }
      });

    } catch (error) {
      console.error(`❌ Lỗi setup consumer: ${error.message}`);
    }
  }

  /**
   * Đóng kết nối
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      console.log('🔌 Đã đóng kết nối RabbitMQ');
    } catch (error) {
      console.error('❌ Lỗi đóng kết nối:', error.message);
    }
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      mode: this.mode,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Singleton instance
const rabbitmqManager = new RabbitMQManager();

// KHÔNG auto-connect! Worker sẽ tự gọi connect() sau khi load env
// rabbitmqManager.connect() - REMOVED

// Graceful shutdown
process.on('SIGINT', async () => {
  await rabbitmqManager.close();
  process.exit(0);
});

export default rabbitmqManager;
