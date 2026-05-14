package kafka

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

// Producer wraps kafka-go's Writer with a typed Publish method.
type Producer struct {
	writer *kafka.Writer
}

// NewProducer creates a producer that writes to the chat.messages topic.
func NewProducer(brokers []string) *Producer {
	writer := &kafka.Writer{
		Addr:         kafka.TCP(brokers...),
		Topic:        TopicChatMessages,
		Balancer:     &kafka.LeastBytes{},
		BatchTimeout: 10 * time.Millisecond, // low latency for chat
		RequiredAcks: kafka.RequireOne,       // leader ack is enough
		Async:        false,                  // synchronous for reliability
	}

	return &Producer{writer: writer}
}

// ChatMessage is the schema of every message published to Kafka.
// Keep this stable — changing it requires a migration strategy.
type ChatMessage struct {
	ID              string `json:"id"`               // client-generated idempotency key
	ChannelID       string `json:"channel_id"`
	UserID          string `json:"user_id"`
	DisplayName     string `json:"display_name"`
	Content         string `json:"content"`
	ParentMessageID string `json:"parent_message_id,omitempty"`
	SentAt          string `json:"sent_at"` // RFC3339
}

// Publish serialises a ChatMessage and writes it to Kafka.
// The channel_id is used as the message key so all messages in a channel
// land on the same partition — preserving order within a channel.
func (p *Producer) Publish(ctx context.Context, msg ChatMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	return p.writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(msg.ChannelID), // partition key = channel_id
		Value: data,
	})
}

// Close flushes pending messages and closes the writer.
func (p *Producer) Close() error {
	return p.writer.Close()
}

// EnsureTopics creates the required Kafka topics if they don't exist.
// Call once at startup before producing any messages.
func EnsureTopics(brokers []string) error {
	conn, err := kafka.Dial("tcp", brokers[0])
	if err != nil {
		return err
	}
	defer conn.Close()

	controller, err := conn.Controller()
	if err != nil {
		return err
	}

	controllerConn, err := kafka.Dial("tcp", controller.Host+":"+itoa(controller.Port))
	if err != nil {
		return err
	}
	defer controllerConn.Close()

	topics := []kafka.TopicConfig{
		{
			Topic:             TopicChatMessages,
			NumPartitions:     4,  // 4 partitions = 4x parallelism
			ReplicationFactor: 1,  // 1 for dev; set to 3 in production
		},
		{
			Topic:             TopicChatMessagesDLQ,
			NumPartitions:     1,
			ReplicationFactor: 1,
		},
	}

	err = controllerConn.CreateTopics(topics...)
	if err != nil {
		// Topic already exists is not a fatal error
		log.Printf("kafka: topic creation: %v (may already exist)", err)
	}

	log.Println("kafka: topics ready")
	return nil
}

func itoa(n int) string {
	return string(rune('0'+n%10)) // simple single-digit helper for port
}