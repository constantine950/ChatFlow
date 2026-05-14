package kafka

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

// MessageHandler is the function the consumer calls for each confirmed message.
// In main.go we wire this to: write to Postgres + broadcast via WS hub.
type MessageHandler func(ctx context.Context, msg ChatMessage) error

// Consumer reads from the chat.messages topic and calls handler for each message.
type Consumer struct {
	reader  *kafka.Reader
	dlqWriter *kafka.Writer
	handler MessageHandler
}

// NewConsumer creates a consumer in the chatflow-message-consumer group.
func NewConsumer(brokers []string, handler MessageHandler) *Consumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        brokers,
		Topic:          TopicChatMessages,
		GroupID:        ConsumerGroupChat,
		MinBytes:       1,                      // fetch as soon as 1 byte available
		MaxBytes:       10 << 20,               // 10MB max per fetch
		MaxWait:        100 * time.Millisecond, // low latency
		CommitInterval: 0,                      // manual commit after processing
	})

	dlqWriter := &kafka.Writer{
		Addr:  kafka.TCP(brokers...),
		Topic: TopicChatMessagesDLQ,
	}

	return &Consumer{
		reader:    reader,
		dlqWriter: dlqWriter,
		handler:   handler,
	}
}

// Run starts the consumer loop. Call in a goroutine — blocks until ctx is cancelled.
func (c *Consumer) Run(ctx context.Context) {
	log.Println("kafka: consumer started")

	for {
		// FetchMessage does NOT commit the offset — we commit manually after success
		kafkaMsg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				// Context cancelled — clean shutdown
				break
			}
			log.Printf("kafka: fetch error: %v", err)
			time.Sleep(time.Second) // back off before retrying
			continue
		}

		var chatMsg ChatMessage
		if err := json.Unmarshal(kafkaMsg.Value, &chatMsg); err != nil {
			log.Printf("kafka: failed to unmarshal message: %v", err)
			// Bad message — commit and skip (don't retry invalid JSON forever)
			c.reader.CommitMessages(ctx, kafkaMsg)
			continue
		}

		// Call the handler — write to Postgres + broadcast
		if err := c.handler(ctx, chatMsg); err != nil {
			log.Printf("kafka: handler error for message %s: %v", chatMsg.ID, err)
			// Send to DLQ so we don't lose the message
			c.sendToDLQ(ctx, kafkaMsg)
			// Still commit so we don't reprocess endlessly
			c.reader.CommitMessages(ctx, kafkaMsg)
			continue
		}

		// Commit only after successful processing
		if err := c.reader.CommitMessages(ctx, kafkaMsg); err != nil {
			log.Printf("kafka: commit error: %v", err)
		}
	}

	log.Println("kafka: consumer stopped")
}

// Close shuts down the reader and DLQ writer.
func (c *Consumer) Close() error {
	c.dlqWriter.Close()
	return c.reader.Close()
}

func (c *Consumer) sendToDLQ(ctx context.Context, original kafka.Message) {
	err := c.dlqWriter.WriteMessages(ctx, kafka.Message{
		Key:   original.Key,
		Value: original.Value,
	})
	if err != nil {
		log.Printf("kafka: failed to write to DLQ: %v", err)
	}
}