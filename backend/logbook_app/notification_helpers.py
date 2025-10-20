from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import EnhancedNotification
from .enhanced_serializers import NotificationSerializer

def send_notification(recipient, actor, notification_type, title, body, related_object=None):
    """
    Create notification and send via WebSocket
    """
    notification = EnhancedNotification.create_notification(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        title=title,
        body=body,
        related_object=related_object
    )
    
    # Serialize notification
    serializer = NotificationSerializer(notification)
    
    # Send to WebSocket channel
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{recipient.id}",
        {
            "type": "notify.message",
            "notification": serializer.data
        }
    )
    
    return notification
