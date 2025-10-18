from rest_framework import serializers
from .models import WeeklyLogbook, LogbookAuditLog, LogbookMessage, CommentThread, CommentMessage, LogbookReviewRequest, UnlockRequest, Notification
from django.contrib.auth.models import User


class LogbookSerializer(serializers.ModelSerializer):
    """Serializer for WeeklyLogbook model"""
    
    week_display = serializers.ReadOnlyField()
    trainee_name = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    section_totals = serializers.SerializerMethodField()
    active_unlock = serializers.SerializerMethodField()
    
    class Meta:
        model = WeeklyLogbook
        fields = [
            'id', 'trainee', 'trainee_name', 'week_start_date', 'week_end_date', 
            'week_display', 'status', 'section_a_entry_ids', 'section_b_entry_ids', 
            'section_c_entry_ids', 'supervisor', 'supervisor_name', 'submitted_at', 
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'supervisor_comments',
            'section_totals', 'active_unlock', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'trainee', 'submitted_at', 'reviewed_at', 'created_at', 'updated_at']
    
    def get_trainee_name(self, obj):
        return f"{obj.trainee.profile.first_name} {obj.trainee.profile.last_name}".strip() or obj.trainee.email
    
    def get_supervisor_name(self, obj):
        if obj.supervisor and hasattr(obj.supervisor, 'profile'):
            return f"{obj.supervisor.profile.first_name} {obj.supervisor.profile.last_name}".strip() or obj.supervisor.email
        return None
    
    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by and hasattr(obj.reviewed_by, 'profile'):
            return f"{obj.reviewed_by.profile.first_name} {obj.reviewed_by.profile.last_name}".strip() or obj.reviewed_by.email
        return None
    
    def get_section_totals(self, obj):
        """Calculate and return section totals"""
        return obj.calculate_section_totals()
    
    def get_active_unlock(self, obj):
        """Get active unlock information if logbook is currently unlocked"""
        active_unlock = obj.get_active_unlock()
        if active_unlock:
            return {
                'unlock_expires_at': active_unlock.unlock_expires_at.isoformat(),
                'duration_minutes': active_unlock.duration_minutes
            }
        return None


class LogbookDraftSerializer(serializers.Serializer):
    """Serializer for logbook draft data"""
    
    week_start = serializers.DateField()
    week_end = serializers.DateField()
    section_a_entries = serializers.SerializerMethodField()
    section_b_entries = serializers.SerializerMethodField()
    section_c_entries = serializers.SerializerMethodField()
    totals = serializers.SerializerMethodField()
    
    def get_section_a_entries(self, obj):
        """Get Section A entries for the week"""
        from section_a.serializers import SectionAEntrySerializer
        entries = obj.get('section_a_entries', [])
        return SectionAEntrySerializer(entries, many=True).data
    
    def get_section_b_entries(self, obj):
        """Get Section B entries for the week"""
        from section_b.serializers import ProfessionalDevelopmentEntrySerializer
        entries = obj.get('section_b_entries', [])
        return ProfessionalDevelopmentEntrySerializer(entries, many=True).data
    
    def get_section_c_entries(self, obj):
        """Get Section C entries for the week"""
        from section_c.serializers import SupervisionEntrySerializer
        entries = obj.get('section_c_entries', [])
        return SupervisionEntrySerializer(entries, many=True).data
    
    def get_totals(self, obj):
        """Calculate totals for the week"""
        return obj.get('totals', {})


class EligibleWeekSerializer(serializers.Serializer):
    """Serializer for eligible weeks"""
    
    week_start = serializers.DateField()
    week_end = serializers.DateField()
    week_display = serializers.CharField()
    section_a_count = serializers.IntegerField()
    section_b_count = serializers.IntegerField()
    section_c_count = serializers.IntegerField()
    total_entries = serializers.IntegerField()


class LogbookSubmissionSerializer(serializers.Serializer):
    """Serializer for logbook submission"""
    
    week_start = serializers.DateField()
    week_end = serializers.DateField()
    section_a_entry_ids = serializers.ListField(child=serializers.IntegerField())
    section_b_entry_ids = serializers.ListField(child=serializers.IntegerField())
    section_c_entry_ids = serializers.ListField(child=serializers.IntegerField())


class LogbookAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for LogbookAuditLog"""
    
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LogbookAuditLog
        fields = [
            'id', 'logbook', 'action', 'user', 'user_name', 'timestamp', 
            'comments', 'previous_status', 'new_status'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def get_user_name(self, obj):
        if obj.user and hasattr(obj.user, 'profile'):
            return f"{obj.user.profile.first_name} {obj.user.profile.last_name}".strip() or obj.user.email
        return obj.user.email if obj.user else 'System'


class CommentMessageSerializer(serializers.ModelSerializer):
    """Serializer for CommentMessage model"""
    
    author_name = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    
    class Meta:
        model = CommentMessage
        fields = [
            'id', 'author', 'author_name', 'author_role', 'message', 'reply_to', 
            'created_at', 'updated_at', 'locked', 'seen_by', 'can_edit', 'can_delete'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'locked', 'seen_by', 'can_edit', 'can_delete']
    
    def get_author_name(self, obj):
        if hasattr(obj.author, 'profile'):
            return f"{obj.author.profile.first_name} {obj.author.profile.last_name}".strip()
        return obj.author.email
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.can_edit(request.user)
        return False
    
    def get_can_delete(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.can_delete(request.user)
        return False


class CommentThreadSerializer(serializers.ModelSerializer):
    """Serializer for CommentThread model with nested messages"""
    
    messages = CommentMessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = CommentThread
        fields = ['id', 'logbook', 'entry_id', 'entry_section', 'thread_type', 'created_at', 'updated_at', 'messages']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UnlockRequestSerializer(serializers.ModelSerializer):
    """Serializer for UnlockRequest model"""
    
    requester_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()
    logbook_week_display = serializers.SerializerMethodField()
    trainee_name = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    is_currently_unlocked = serializers.SerializerMethodField()
    remaining_time_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = UnlockRequest
        fields = [
            'id', 'logbook', 'requester', 'requester_name', 'requester_role', 'reason', 
            'target_section', 'status', 'reviewed_by', 'reviewer_name', 'reviewer_role', 
            'reviewed_at', 'admin_comment', 'unlock_expires_at', 'duration_minutes', 
            'manually_relocked', 'created_at', 'logbook_week_display', 
            'trainee_name', 'can_review', 'is_currently_unlocked', 'remaining_time_minutes'
        ]
        read_only_fields = ['id', 'requester', 'requester_role', 'created_at']
    
    def get_requester_name(self, obj):
        if hasattr(obj.requester, 'profile'):
            return f"{obj.requester.profile.first_name} {obj.requester.profile.last_name}".strip()
        return obj.requester.email
    
    def get_reviewer_name(self, obj):
        if obj.reviewed_by and hasattr(obj.reviewed_by, 'profile'):
            return f"{obj.reviewed_by.profile.first_name} {obj.reviewed_by.profile.last_name}".strip()
        return obj.reviewed_by.email if obj.reviewed_by else None
    
    def get_logbook_week_display(self, obj):
        return obj.logbook.week_display
    
    def get_trainee_name(self, obj):
        if hasattr(obj.logbook.trainee, 'profile'):
            return f"{obj.logbook.trainee.profile.first_name} {obj.logbook.trainee.profile.last_name}".strip()
        return obj.logbook.trainee.email
    
    def get_can_review(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        # Check if current user can review this request
        user_role = request.user.profile.role if hasattr(request.user, 'profile') else None
        expected_reviewer = obj.get_reviewer()
        
        if expected_reviewer == 'org_admin' and user_role == 'ORG_ADMIN':
            return True
        elif expected_reviewer == 'supervisor' and user_role == 'SUPERVISOR':
            return True
        
        return False
    
    def get_is_currently_unlocked(self, obj):
        return obj.is_currently_unlocked()
    
    def get_remaining_time_minutes(self, obj):
        return obj.get_remaining_time_minutes()


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""
    
    type_display = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()
    action_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'type_display', 'payload', 'read', 
            'created_at', 'message', 'action_url'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_type_display(self, obj):
        """Get human-readable type display"""
        type_mapping = {
            'logbook_submitted': 'Logbook Submitted',
            'logbook_status_updated': 'Status Updated',
            'comment_added': 'New Comment',
            'unlock_requested': 'Unlock Requested',
            'unlock_approved': 'Unlock Approved',
            'unlock_denied': 'Unlock Denied',
            'unlock_expiry_warning': 'Unlock Expiring Soon',
            'supervision_invite_pending': 'Supervision Invite',
            'system_message': 'System Message',
        }
        return type_mapping.get(obj.notification_type, obj.notification_type)
    
    def get_message(self, obj):
        """Generate human-readable message based on type and payload"""
        payload = obj.payload or {}
        
        if obj.notification_type == 'logbook_submitted':
            trainee_name = payload.get('traineeName', 'A trainee')
            week_display = payload.get('weekDisplay', 'a logbook')
            return f"{trainee_name} submitted {week_display} for review."
        
        elif obj.notification_type == 'logbook_status_updated':
            week_display = payload.get('weekDisplay', 'Your logbook')
            new_status = payload.get('newStatus', 'updated')
            status_display = {
                'approved': 'approved',
                'rejected': 'rejected',
                'submitted': 'submitted'
            }.get(new_status, new_status)
            return f"{week_display} has been {status_display}."
        
        elif obj.notification_type == 'comment_added':
            author_name = payload.get('authorName', 'Someone')
            comment_type = payload.get('commentType', 'comment')
            return f"{author_name} left a {comment_type} on your logbook."
        
        elif obj.notification_type == 'unlock_requested':
            requester_name = payload.get('requesterName', 'A user')
            week_display = payload.get('weekDisplay', 'a logbook')
            return f"{requester_name} requested to unlock {week_display}."
        
        elif obj.notification_type == 'unlock_approved':
            week_display = payload.get('weekDisplay', 'Your logbook')
            duration_minutes = payload.get('durationMinutes', 0)
            duration_text = self._format_duration(duration_minutes)
            return f"You can now edit {week_display} for {duration_text}."
        
        elif obj.notification_type == 'unlock_denied':
            week_display = payload.get('weekDisplay', 'Your logbook')
            return f"Your unlock request for {week_display} was denied."
        
        elif obj.notification_type == 'unlock_expiry_warning':
            week_display = payload.get('weekDisplay', 'Your logbook')
            return f"Your unlock for {week_display} will expire in 15 minutes."
        
        elif obj.notification_type == 'supervision_invite_pending':
            supervisor_name = payload.get('supervisorName', 'A supervisor')
            role = payload.get('role', 'supervision')
            return f"{supervisor_name} has invited you for {role}."
        
        elif obj.notification_type == 'system_message':
            return payload.get('message', 'You have a new system message.')
        
        return "You have a new notification."
    
    def get_action_url(self, obj):
        """Generate URL for notification action"""
        payload = obj.payload or {}
        
        if obj.notification_type in ['logbook_submitted', 'logbook_status_updated']:
            logbook_id = payload.get('logbookId')
            if logbook_id:
                return f"/logbooks/{logbook_id}/review"
        
        elif obj.notification_type == 'comment_added':
            logbook_id = payload.get('logbookId')
            if logbook_id:
                return f"/logbooks/{logbook_id}/review"
        
        elif obj.notification_type in ['unlock_requested', 'unlock_approved', 'unlock_denied']:
            if obj.notification_type == 'unlock_requested':
                return "/logbook/unlock-requests/queue"
            else:
                logbook_id = payload.get('logbookId')
                if logbook_id:
                    return f"/logbooks/{logbook_id}"
        
        elif obj.notification_type == 'unlock_expiry_warning':
            logbook_id = payload.get('logbookId')
            if logbook_id:
                return f"/logbooks/{logbook_id}"
        
        elif obj.notification_type == 'supervision_invite_pending':
            return "/supervision/requests"
        
        return None
    
    def _format_duration(self, minutes):
        """Format duration in minutes to human-readable text"""
        if minutes < 60:
            return f"{minutes} minutes"
        elif minutes < 1440:
            hours = minutes // 60
            remaining_minutes = minutes % 60
            if remaining_minutes > 0:
                return f"{hours}h {remaining_minutes}m"
            return f"{hours} hours"
        else:
            days = minutes // 1440
            remaining_hours = (minutes % 1440) // 60
            if remaining_hours > 0:
                return f"{days}d {remaining_hours}h"
            return f"{days} days"


class LogbookReviewRequestSerializer(serializers.ModelSerializer):
    """Serializer for LogbookReviewRequest model"""
    
    requested_by_name = serializers.SerializerMethodField()
    logbook_week_display = serializers.SerializerMethodField()
    
    class Meta:
        model = LogbookReviewRequest
        fields = [
            'id', 'logbook', 'logbook_week_display', 'requested_by', 'requested_by_name',
            'requested_at', 'status', 'review_started_at', 'review_completed_at', 'supervisor_notes'
        ]
        read_only_fields = ['id', 'requested_by', 'requested_at', 'review_started_at', 'review_completed_at']
    
    def get_requested_by_name(self, obj):
        if obj.requested_by and hasattr(obj.requested_by, 'profile'):
            return f"{obj.requested_by.profile.first_name} {obj.requested_by.profile.last_name}".strip() or obj.requested_by.email
        return obj.requested_by.email if obj.requested_by else None
    
    def get_logbook_week_display(self, obj):
        return f"Week {obj.logbook.week_number} ({obj.logbook.week_start_date})"


class UnlockRequestSerializer(serializers.ModelSerializer):
    """Serializer for UnlockRequest model"""
    
    requester_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    logbook_week_display = serializers.SerializerMethodField()
    is_expired = serializers.ReadOnlyField()
    can_be_approved = serializers.ReadOnlyField()
    
    class Meta:
        model = UnlockRequest
        fields = [
            'id', 'logbook', 'logbook_week_display', 'requester', 'requester_name',
            'reason', 'status', 'requested_at', 'reviewed_by', 'reviewed_by_name',
            'reviewed_at', 'unlock_expires_at', 'manually_relocked', 'supervisor_response',
            'is_expired', 'can_be_approved'
        ]
        read_only_fields = ['id', 'requester', 'requested_at', 'reviewed_at', 'is_expired', 'can_be_approved']
    
    def get_requester_name(self, obj):
        if obj.requester and hasattr(obj.requester, 'profile'):
            return f"{obj.requester.profile.first_name} {obj.requester.profile.last_name}".strip() or obj.requester.email
        return obj.requester.email if obj.requester else None
    
    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by and hasattr(obj.reviewed_by, 'profile'):
            return f"{obj.reviewed_by.profile.first_name} {obj.reviewed_by.profile.last_name}".strip() or obj.reviewed_by.email
        return None
    
    def get_logbook_week_display(self, obj):
        return f"Week {obj.logbook.week_number} ({obj.logbook.week_start_date})"