from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.utils import timezone
import json
import logging

from .models import (
    ConfigurationCategory,
    SystemConfiguration,
    ConfigurationItem,
    ConfigurationPreset,
    ConfigurationAuditLog
)
from .serializers import (
    ConfigurationCategorySerializer,
    SystemConfigurationSerializer,
    ConfigurationItemSerializer,
    ConfigurationPresetSerializer,
    ConfigurationAuditLogSerializer,
    ConfigurationUpdateSerializer,
    ConfigurationFilterSerializer
)

logger = logging.getLogger(__name__)


class ConfigurationCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for configuration categories"""
    queryset = ConfigurationCategory.objects.all()
    serializer_class = ConfigurationCategorySerializer
    permission_classes = [IsAuthenticated]


class SystemConfigurationViewSet(viewsets.ModelViewSet):
    """Viewset for managing system configurations"""
    queryset = SystemConfiguration.objects.all()
    serializer_class = SystemConfigurationSerializer
    permission_classes = [IsAdminUser]
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def get_filtered(self, request, pk=None):
        """Get configuration filtered by user role and context"""
        configuration = get_object_or_404(SystemConfiguration, pk=pk)
        
        # Get filter parameters
        user_role = request.query_params.get('user_role', '')
        context = request.query_params.get('context', '')
        
        # Filter items based on role and context
        items = configuration.items.all()
        
        if user_role:
            items = items.filter(
                models.Q(user_roles__isnull=True) | 
                models.Q(user_roles__contains=[user_role])
            )
        
        if context:
            items = items.filter(
                models.Q(contexts__isnull=True) | 
                models.Q(contexts__contains=[context])
            )
        
        # Build response
        response_data = {
            'configuration': {
                'id': configuration.id,
                'name': configuration.name,
                'description': configuration.description,
            },
            'items': {}
        }
        
        for item in items:
            response_data['items'][item.key] = {
                'value': item.get_parsed_value(),
                'display_name': item.display_name,
                'description': item.description,
                'value_type': item.value_type
            }
        
        return Response(response_data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def update_items(self, request, pk=None):
        """Update configuration items"""
        configuration = get_object_or_404(SystemConfiguration, pk=pk)
        
        serializer = ConfigurationUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        items_data = serializer.validated_data['items']
        changes = []
        
        try:
            with transaction.atomic():
                for item_data in items_data:
                    try:
                        item = configuration.items.get(key=item_data['key'])
                        old_value = item.value
                        item.value = str(item_data['value'])
                        item.save()
                        
                        if old_value != item.value:
                            changes.append({
                                'key': item.key,
                                'old_value': old_value,
                                'new_value': item.value
                            })
                    except ConfigurationItem.DoesNotExist:
                        logger.warning(f"Configuration item not found: {item_data['key']}")
                        continue
                
                # Log the changes
                if changes:
                    ConfigurationAuditLog.objects.create(
                        configuration=configuration,
                        user=request.user,
                        action='updated',
                        changes={'items': changes}
                    )
                
                return Response({
                    'success': True,
                    'message': 'Configuration updated successfully',
                    'changes': changes
                })
                
        except Exception as e:
            logger.error(f"Error updating configuration: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to update configuration'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def publish(self, request, pk=None):
        """Publish configuration changes"""
        configuration = get_object_or_404(SystemConfiguration, pk=pk)
        
        try:
            # Log the publication
            ConfigurationAuditLog.objects.create(
                configuration=configuration,
                user=request.user,
                action='published',
                changes={'published_at': timezone.now().isoformat()}
            )
            
            return Response({
                'success': True,
                'message': 'Configuration published successfully'
            })
            
        except Exception as e:
            logger.error(f"Error publishing configuration: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to publish configuration'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfigurationItemViewSet(viewsets.ModelViewSet):
    """Viewset for managing individual configuration items"""
    queryset = ConfigurationItem.objects.all()
    serializer_class = ConfigurationItemSerializer
    permission_classes = [IsAdminUser]


class ConfigurationPresetViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for configuration presets"""
    queryset = ConfigurationPreset.objects.all()
    serializer_class = ConfigurationPresetSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def apply(self, request, pk=None):
        """Apply a preset to a configuration"""
        preset = get_object_or_404(ConfigurationPreset, pk=pk)
        configuration_name = request.data.get('configuration_name')
        
        if not configuration_name:
            return Response({
                'error': 'configuration_name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            configuration = SystemConfiguration.objects.get(name=configuration_name)
        except SystemConfiguration.DoesNotExist:
            return Response({
                'error': 'Configuration not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            with transaction.atomic():
                preset_data = preset.preset_data
                
                # Apply preset data to configuration items
                for key, value in preset_data.items():
                    try:
                        item = configuration.items.get(key=key)
                        item.value = str(value)
                        item.save()
                    except ConfigurationItem.DoesNotExist:
                        logger.warning(f"Configuration item not found for preset key: {key}")
                        continue
                
                # Log the preset application
                ConfigurationAuditLog.objects.create(
                    configuration=configuration,
                    user=request.user,
                    action='updated',
                    changes={'preset_applied': preset.name, 'preset_data': preset_data}
                )
                
                return Response({
                    'success': True,
                    'message': f'Preset "{preset.name}" applied successfully'
                })
                
        except Exception as e:
            logger.error(f"Error applying preset: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to apply preset'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfigurationAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for configuration audit logs"""
    queryset = ConfigurationAuditLog.objects.all()
    serializer_class = ConfigurationAuditLogSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ['configuration', 'user', 'action']


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def logbook_config(request):
    """Get or set logbook configuration (POST requires support admin)"""
    config = SystemConfiguration.get_config()
    
    if request.method == 'GET':
        return Response({
            'target_count': config.target_logbooks_count,
            'submission_deadline_days': config.submission_deadline_days
        })
    
    elif request.method == 'POST':
        # Only support admin can modify
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'SUPPORT':
            return Response({'error': 'Unauthorized'}, status=403)
        
        target = request.data.get('target_count')
        deadline_days = request.data.get('submission_deadline_days')
        
        if target is not None:
            if not isinstance(target, int) or target < 1 or target > 104:
                return Response({'error': 'Invalid target count (1-104)'}, status=400)
            config.target_logbooks_count = target
        
        if deadline_days is not None:
            if not isinstance(deadline_days, int) or deadline_days < 1 or deadline_days > 30:
                return Response({'error': 'Invalid deadline days (1-30)'}, status=400)
            config.submission_deadline_days = deadline_days
        
        config.save()
        return Response({
            'target_count': config.target_logbooks_count,
            'submission_deadline_days': config.submission_deadline_days
        })

