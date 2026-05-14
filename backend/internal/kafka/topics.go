package kafka

// Topic names — keep all Kafka topic strings in one place
// so a typo doesn't cause silent message loss.

const (
	// TopicChatMessages is the main pipeline topic.
	// Every sent message is produced here before hitting Postgres.
	TopicChatMessages = "chat.messages"

	// TopicChatMessagesDLQ is the dead letter queue.
	// Messages that fail to write to Postgres land here for alerting/replay.
	TopicChatMessagesDLQ = "chat.messages.dlq"

	// ConsumerGroupChat is the consumer group ID for the message pipeline.
	// Kafka uses this to track which messages have been processed.
	ConsumerGroupChat = "chatflow-message-consumer"
)