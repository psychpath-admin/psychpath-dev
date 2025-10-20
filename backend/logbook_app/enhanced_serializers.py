"""
Enhanced Serializers for Logbook Review Process
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import EnhancedLogbook, EnhancedLogbookSection, EnhancedLogbookComment, EnhancedLogbookAudit, EnhancedNotification


class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer for nested relationships"""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']


class LogbookSectionSerializer(serializers.ModelSerializer):
    """Serializer for logbook sections"""
    
    class Meta:
        model = EnhancedLogbookSection
        fields = [
            'id', 'section_type', 'title', 'content_json', 
            'is_locked', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LogbookCommentSerializer(serializers.ModelSerializer):
    """Serializer for logbook comments"""
    
    author = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = EnhancedLogbookComment
        fields = [
            'id', 'logbook', 'section', 'record_id', 'author', 
            'text', 'scope', 'parent_comment', 'created_at', 'replies'
        ]
        read_only_fields = ['id', 'author', 'created_at']
    
    def get_replies(self, obj):
        """Get nested replies"""
        replies = obj.replies.all()
        return LogbookCommentSerializer(replies, many=True).data
    
    def create(self, validated_data):
        """Override create to set author from request"""
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class LogbookAuditSerializer(serializers.ModelSerializer):
    """Serializer for audit trail entries"""
    
    actor = UserSerializer(read_only=True)
    
    class Meta:
        model = EnhancedLogbookAudit
        fields = [
            'id', 'logbook', 'actor', 'action', 'description', 
            'timestamp', 'diff_snapshot'
        ]
        read_only_fields = ['id', 'timestamp']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications"""
    actor_name = serializers.SerializerMethodField()
    related_object_type = serializers.SerializerMethodField()
    related_object_id = serializers.CharField(source='object_id', read_only=True)
    
    class Meta:
        model = EnhancedNotification
        fields = [
            'id', 'title', 'body', 'notification_type', 'actor_name',
            'related_object_type', 'related_object_id', 'read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_actor_name(self, obj):
        if obj.actor:
            if hasattr(obj.actor, 'profile'):
                return f"{obj.actor.profile.first_name} {obj.actor.profile.last_name}"
            return obj.actor.email
        return "System"
    
    def get_related_object_type(self, obj):
        return obj.content_type.model if obj.content_type else None


class LogbookSerializer(serializers.ModelSerializer):
    """Main logbook serializer with nested relationships"""
    
    owner = UserSerializer(read_only=True)
    supervisor = UserSerializer(read_only=True)
    sections = LogbookSectionSerializer(many=True, read_only=True)
    comments = LogbookCommentSerializer(many=True, read_only=True)
    audit_entries = LogbookAuditSerializer(many=True, read_only=True)
    
    # Computed fields
    is_locked = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_submit = serializers.SerializerMethodField()
    can_approve = serializers.SerializerMethodField()
    can_reject = serializers.SerializerMethodField()
    can_request_unlock = serializers.SerializerMethodField()
    can_grant_unlock = serializers.SerializerMethodField()
    
    class Meta:
        model = EnhancedLogbook
        fields = [
            'id', 'owner', 'supervisor', 'week_start_date', 'status',
            'total_dcc_hours', 'total_cra_hours', 'total_pd_hours', 'total_supervision_hours',
            'created_at', 'updated_at', 'submitted_at', 'approved_at', 'locked_at',
            'pdf_url', 'notes', 'sections', 'comments', 'audit_entries',
            'is_locked', 'can_edit', 'can_submit', 'can_approve', 'can_reject',
            'can_request_unlock', 'can_grant_unlock'
        ]
        read_only_fields = [
            'id', 'owner', 'created_at', 'updated_at', 'submitted_at', 
            'approved_at', 'locked_at', 'is_locked', 'can_edit', 'can_submit',
            'can_approve', 'can_reject', 'can_request_unlock', 'can_grant_unlock'
        ]
    
    def get_is_locked(self, obj):
        """Check if logbook is locked"""
        return obj.is_locked()
    
    def get_can_edit(self, obj):
        """Check if current user can edit"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.can_be_edited_by(request.user)
    
    def get_can_submit(self, obj):
        """Check if current user can submit"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.can_be_submitted_by(request.user)
    
    def get_can_approve(self, obj):
        """Check if current user can approve"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.can_be_approved_by(request.user)
    
    def get_can_reject(self, obj):
        """Check if current user can reject"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.can_be_rejected_by(request.user)
    
    def get_can_request_unlock(self, obj):
        """Check if current user can request unlock"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.can_request_unlock_by(request.user)
    
    def get_can_grant_unlock(self, obj):
        """Check if current user can grant unlock"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.can_grant_unlock_by(request.user)


class LogbookListSerializer(serializers.ModelSerializer):
    """Simplified serializer for logbook lists"""
    
    owner = UserSerializer(read_only=True)
    supervisor = UserSerializer(read_only=True)
    is_locked = serializers.SerializerMethodField()
    
    class Meta:
        model = EnhancedLogbook
        fields = [
            'id', 'owner', 'supervisor', 'week_start_date', 'status',
            'total_dcc_hours', 'total_cra_hours', 'total_pd_hours', 'total_supervision_hours',
            'created_at', 'updated_at', 'submitted_at', 'approved_at', 'is_locked'
        ]
    
    def get_is_locked(self, obj):
        """Check if logbook is locked"""
        return obj.is_locked()


class LogbookCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new logbooks"""
    
    class Meta:
        model = EnhancedLogbook
        fields = ['week_start_date', 'supervisor', 'notes']
    
    def create(self, validated_data):
        """Override create to set owner from request"""
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class LogbookUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating logbooks"""
    
    class Meta:
        model = EnhancedLogbook
        fields = ['notes', 'total_dcc_hours', 'total_cra_hours', 'total_pd_hours', 'total_supervision_hours']
    
    def validate(self, data):
        """Validate that logbook can be updated"""
        if self.instance.is_locked():
            raise serializers.ValidationError("Cannot update locked logbook")
        return data


class LogbookSubmitSerializer(serializers.Serializer):
    """Serializer for logbook submission"""
    
    def validate(self, data):
        """Validate submission requirements"""
        logbook = self.context['logbook']
        
        if logbook.status != 'draft':
            raise serializers.ValidationError("Only draft logbooks can be submitted")
        
        if not logbook.supervisor:
            raise serializers.ValidationError("Logbook must have a supervisor assigned")
        
        return data


class LogbookApproveSerializer(serializers.Serializer):
    """Serializer for logbook approval"""
    
    supervisor_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate approval requirements"""
        logbook = self.context['logbook']
        
        if logbook.status != 'under_review':
            raise serializers.ValidationError("Only logbooks under review can be approved")
        
        return data


class LogbookRejectSerializer(serializers.Serializer):
    """Serializer for logbook rejection"""
    
    rejection_reason = serializers.CharField(required=True)
    
    def validate(self, data):
        """Validate rejection requirements"""
        logbook = self.context['logbook']
        
        if logbook.status != 'under_review':
            raise serializers.ValidationError("Only logbooks under review can be rejected")
        
        return data


class LogbookUnlockRequestSerializer(serializers.Serializer):
    """Serializer for unlock requests"""
    
    reason = serializers.CharField(required=True)
    
    def validate(self, data):
        """Validate unlock request requirements"""
        logbook = self.context['logbook']
        
        if logbook.status != 'approved':
            raise serializers.ValidationError("Only approved logbooks can be unlocked")
        
        return data


class LogbookUnlockGrantSerializer(serializers.Serializer):
    """Serializer for granting unlock requests"""
    
    duration_hours = serializers.IntegerField(min_value=1, max_value=168, default=24)
    
    def validate(self, data):
        """Validate unlock grant requirements"""
        logbook = self.context['logbook']
        
        if logbook.status != 'approved':
            raise serializers.ValidationError("Only approved logbooks can be unlocked")
        
        return data
