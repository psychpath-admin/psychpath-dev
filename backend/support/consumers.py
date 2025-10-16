import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.utils import timezone
from .models import ChatSession, ChatMessage, SupportTicket, SupportUserStatus
from .emails import send_ticket_reply_email


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Connect to WebSocket and join room"""
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        self.room_group_name = f'chat_{self.ticket_id}'
        self.user = self.scope['user']
        
        # Check if user is authenticated
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Check if user has permission to access this ticket
        if not await self.check_ticket_permission():
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send chat history
        await self.send_chat_history()
        
        # Update support user status if applicable
        await self.update_support_status()

    async def disconnect(self, close_code):
        """Leave room group"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Update last activity timestamp
        await self.update_support_status()

    async def receive(self, text_data):
        """Receive message from WebSocket"""
        try:
            text_data_json = json.loads(text_data)
            message = text_data_json['message']
            
            # Save message to database
            chat_message = await self.save_message(message)
            
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': {
                        'id': chat_message['id'],
                        'message': chat_message['message'],
                        'sender': chat_message['sender'],
                        'is_support': chat_message['is_support'],
                        'created_at': chat_message['created_at'],
                        'read_by_user': chat_message['read_by_user'],
                        'read_by_support': chat_message['read_by_support'],
                    }
                }
            )
            
            # Send email notification if needed
            await self.send_email_notification(chat_message)
            
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))

    async def chat_message(self, event):
        """Receive message from room group"""
        message = event['message']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': message
        }))

    async def send_chat_history(self):
        """Send chat history to newly connected user"""
        messages = await self.get_chat_history()
        await self.send(text_data=json.dumps({
            'type': 'chat_history',
            'messages': messages
        }))

    @database_sync_to_async
    def check_ticket_permission(self):
        """Check if user has permission to access this ticket"""
        try:
            if self.ticket_id == 'general':
                return True
            
            ticket = SupportTicket.objects.get(id=self.ticket_id)
            
            # User can access if they created the ticket or are support staff
            if ticket.user == self.user:
                return True
            
            # Check if user is support staff
            if hasattr(self.user, 'support_profile'):
                return True
            
            return False
        except SupportTicket.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, message_text):
        """Save message to database"""
        try:
            # Get or create chat session
            if self.ticket_id == 'general':
                # General chat session (not tied to a specific ticket)
                session, created = ChatSession.objects.get_or_create(
                    user=self.user,
                    ticket=None,
                    defaults={
                        'status': 'ACTIVE',
                        'support_user': None
                    }
                )
            else:
                ticket = SupportTicket.objects.get(id=self.ticket_id)
                session, created = ChatSession.objects.get_or_create(
                    user=self.user,
                    ticket=ticket,
                    defaults={
                        'status': 'ACTIVE',
                        'support_user': None
                    }
                )
            
            # Check if user is support staff
            is_support = hasattr(self.user, 'support_profile')
            
            # Create message
            chat_message = ChatMessage.objects.create(
                session=session,
                sender=self.user,
                message=message_text,
                is_support=is_support,
                read_by_user=not is_support,  # User has read their own message
                read_by_support=is_support    # Support has read their own message
            )
            
            # Update session last message time
            session.last_message_at = timezone.now()
            session.save()
            
            # Update ticket if applicable
            if session.ticket:
                session.ticket.last_message_at = timezone.now()
                session.ticket.has_unread_messages = True
                session.ticket.save()
            
            # Assign support user if this is the first support message
            if is_support and not session.support_user:
                session.support_user = self.user
                session.status = 'ACTIVE'
                session.save()
            
            return {
                'id': chat_message.id,
                'message': chat_message.message,
                'sender': {
                    'id': self.user.id,
                    'email': self.user.email,
                    'first_name': self.user.first_name,
                    'last_name': self.user.last_name,
                },
                'is_support': chat_message.is_support,
                'created_at': chat_message.created_at.isoformat(),
                'read_by_user': chat_message.read_by_user,
                'read_by_support': chat_message.read_by_support,
            }
            
        except Exception as e:
            raise Exception(f"Failed to save message: {str(e)}")

    @database_sync_to_async
    def get_chat_history(self):
        """Get chat history for this ticket/session"""
        try:
            if self.ticket_id == 'general':
                # Get general chat session for this user
                session = ChatSession.objects.filter(
                    user=self.user,
                    ticket=None
                ).first()
            else:
                ticket = SupportTicket.objects.get(id=self.ticket_id)
                session = ChatSession.objects.filter(
                    user=self.user,
                    ticket=ticket
                ).first()
            
            if not session:
                return []
            
            messages = ChatMessage.objects.filter(session=session).order_by('created_at')
            
            return [
                {
                    'id': msg.id,
                    'message': msg.message,
                    'sender': {
                        'id': msg.sender.id,
                        'email': msg.sender.email,
                        'first_name': msg.sender.first_name,
                        'last_name': msg.sender.last_name,
                    },
                    'is_support': msg.is_support,
                    'created_at': msg.created_at.isoformat(),
                    'read_by_user': msg.read_by_user,
                    'read_by_support': msg.read_by_support,
                }
                for msg in messages
            ]
            
        except Exception as e:
            return []

    @database_sync_to_async
    def update_support_status(self):
        """Update support user status"""
        try:
            if hasattr(self.user, 'support_profile'):
                status, created = SupportUserStatus.objects.get_or_create(
                    user=self.user,
                    defaults={
                        'is_online': True,
                        'auto_status': True
                    }
                )
                status.last_activity = timezone.now()
                status.save()
        except Exception:
            pass  # Ignore errors for non-support users

    @database_sync_to_async
    def send_email_notification(self, chat_message_data):
        """Send email notification for chat message"""
        try:
            # Get the chat message object
            chat_message = ChatMessage.objects.get(id=chat_message_data['id'])
            
            # Send email notification
            if chat_message.session.ticket:
                send_ticket_reply_email(
                    chat_message.session.ticket,
                    chat_message,
                    chat_message.is_support
                )
        except Exception as e:
            print(f"Failed to send email notification: {e}")
            pass  # Don't fail the WebSocket connection if email fails
