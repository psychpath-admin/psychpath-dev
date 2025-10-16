from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.contrib.auth.models import User
from .models import SupportTicket, ChatMessage, SupportUser


def send_new_ticket_email(ticket):
    """Send email notification to support team about new ticket"""
    try:
        # Get support team emails
        support_users = User.objects.filter(support_profile__is_active=True)
        support_emails = [user.email for user in support_users if user.email]
        
        if not support_emails:
            return False
        
        subject = f"New Support Ticket #{ticket.id}: {ticket.subject}"
        
        context = {
            'ticket': ticket,
            'user': ticket.user,
            'site_url': getattr(settings, 'SITE_URL', 'http://localhost:8000'),
        }
        
        # Try to render HTML template, fallback to plain text
        try:
            html_message = render_to_string('support/emails/new_ticket.html', context)
        except:
            html_message = None
        
        plain_message = f"""
New support ticket has been created:

Ticket ID: #{ticket.id}
Subject: {ticket.subject}
Priority: {ticket.get_priority_display()}
User: {ticket.user.email}
Created: {ticket.created_at}

Description:
{ticket.description}

You can view and respond to this ticket at: {context['site_url']}/support/
        """.strip()
        
        send_mail(
            subject=subject,
            message=plain_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=support_emails,
            fail_silently=False,
        )
        
        return True
        
    except Exception as e:
        print(f"Failed to send new ticket email: {e}")
        return False


def send_ticket_reply_email(ticket, message, is_support_reply=True):
    """Send email notification about ticket reply"""
    try:
        if is_support_reply:
            # Support replied, notify user
            recipient_email = ticket.user.email
            sender_name = message.sender.get_full_name() or message.sender.email
            subject = f"Re: Support Ticket #{ticket.id}: {ticket.subject}"
            
            context = {
                'ticket': ticket,
                'message': message,
                'sender_name': sender_name,
                'is_support_reply': True,
                'site_url': getattr(settings, 'SITE_URL', 'http://localhost:8000'),
            }
            
            plain_message = f"""
{sender_name} from the support team has replied to your ticket:

Ticket ID: #{ticket.id}
Subject: {ticket.subject}

Reply:
{message.message}

You can view the full conversation at: {context['site_url']}/support-tickets
            """.strip()
            
        else:
            # User replied, notify support team
            support_users = User.objects.filter(support_profile__is_active=True)
            support_emails = [user.email for user in support_users if user.email]
            
            if not support_emails:
                return False
            
            recipient_email = support_emails
            sender_name = ticket.user.get_full_name() or ticket.user.email
            subject = f"Re: Support Ticket #{ticket.id}: {ticket.subject} - User Reply"
            
            context = {
                'ticket': ticket,
                'message': message,
                'sender_name': sender_name,
                'is_support_reply': False,
                'site_url': getattr(settings, 'SITE_URL', 'http://localhost:8000'),
            }
            
            plain_message = f"""
{sender_name} has replied to ticket #{ticket.id}:

Subject: {ticket.subject}

User Reply:
{message.message}

You can view and respond at: {context['site_url']}/support/
            """.strip()
        
        # Try to render HTML template, fallback to plain text
        try:
            html_message = render_to_string('support/emails/ticket_reply.html', context)
        except:
            html_message = None
        
        send_mail(
            subject=subject,
            message=plain_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_email,
            fail_silently=False,
        )
        
        return True
        
    except Exception as e:
        print(f"Failed to send ticket reply email: {e}")
        return False


def send_ticket_update_email(ticket, old_status, new_status, updated_by):
    """Send email notification about ticket status update"""
    try:
        # Notify user about status change
        subject = f"Support Ticket #{ticket.id} Status Updated: {ticket.subject}"
        
        context = {
            'ticket': ticket,
            'old_status': old_status,
            'new_status': new_status,
            'updated_by': updated_by,
            'site_url': getattr(settings, 'SITE_URL', 'http://localhost:8000'),
        }
        
        # Try to render HTML template, fallback to plain text
        try:
            html_message = render_to_string('support/emails/ticket_update.html', context)
        except:
            html_message = None
        
        plain_message = f"""
Your support ticket status has been updated:

Ticket ID: #{ticket.id}
Subject: {ticket.subject}
Previous Status: {old_status}
New Status: {new_status}
Updated By: {updated_by.get_full_name() or updated_by.email}

You can view your ticket at: {context['site_url']}/support-tickets
        """.strip()
        
        send_mail(
            subject=subject,
            message=plain_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.user.email],
            fail_silently=False,
        )
        
        return True
        
    except Exception as e:
        print(f"Failed to send ticket update email: {e}")
        return False
