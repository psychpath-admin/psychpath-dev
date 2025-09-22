from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import UserProfile, EmailVerificationCode, UserRole, Message, SupervisorRequest, SupervisorInvitation, SupervisorEndorsement, Supervision, SupervisionNotification, SupervisionAssignment
from .serializers import UserProfileSerializer, MessageSerializer, SupervisorRequestSerializer, SupervisorInvitationSerializer, SupervisorEndorsementSerializer, SupervisionSerializer, SupervisionNotificationSerializer, SupervisionInviteSerializer, SupervisionResponseSerializer, SupervisionAssignmentSerializer, SupervisionAssignmentCreateSerializer
from .email_service import send_supervision_invite_email, send_supervision_response_email, send_supervision_reminder_email, send_supervision_expired_email
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
import base64
import mimetypes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
import json
from logging_utils import support_error_handler, audit_data_access, log_data_access, log_supervision_action
from django.conf import settings
from django.db.models import Sum
from datetime import date, timedelta

def health(_request):
    return JsonResponse({"status": "ok"})

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@support_error_handler
@audit_data_access('USER_PROFILE', 'UserProfile')
def user_profile(request):
    """
    Get or update user profile
    """
    try:
        print(f"=== USER PROFILE VIEW STARTED ===")
        print(f"Request user: {request.user.email if request.user else 'Anonymous'}")
        user_profile = UserProfile.objects.get(user=request.user)
        print(f"User profile found: {user_profile.role}")
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print(f"Error in user_profile view: {e}")
        return JsonResponse({'error': f'Unexpected error: {str(e)}'}, status=500)
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(user_profile)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        try:
            # Handle file uploads for signature
            print(f"=== REQUEST DEBUG ===")
            print(f"Content type: {request.content_type}")
            print(f"Method: {request.method}")
            print(f"FILES keys: {list(request.FILES.keys())}")
            
            data = request.data.copy()
            print(f"Data keys: {list(data.keys())}")
            print(f"Raw data: {data}")
        except Exception as e:
            print(f"Error accessing request.data: {e}")
            return JsonResponse({'error': f'Error parsing request data: {str(e)}'}, status=400)

        # Handle signature file upload (demo: store filename)
        if 'signature' in request.FILES:
            try:
                signature_file = request.FILES['signature']
                print(f"Processing signature file: {signature_file.name}, size: {signature_file.size}")
                
                # Check file size limit (2MB)
                if signature_file.size > 2 * 1024 * 1024:
                    print(f"File too large: {signature_file.size} bytes")
                    return JsonResponse({'error': 'File too large. Maximum size is 2MB.'}, status=400)
                
                # Convert to data URL so it renders without a media server
                content = signature_file.read()
                mime, _ = mimetypes.guess_type(signature_file.name)
                mime = mime or 'image/png'
                b64 = base64.b64encode(content).decode('ascii')
                data['signature_url'] = f"data:{mime};base64,{b64}"
                print(f"Generated signature_url with length: {len(data['signature_url'])}")
            except Exception as e:
                print(f"Error processing signature file: {e}")
                import traceback
                traceback.print_exc()
                return JsonResponse({'error': f'Error processing signature file: {str(e)}'}, status=400)

        # Handle initials file upload
        if 'initials' in request.FILES:
            try:
                initials_file = request.FILES['initials']
                print(f"Processing initials file: {initials_file.name}, size: {initials_file.size}")
                
                # Check file size limit (2MB)
                if initials_file.size > 2 * 1024 * 1024:
                    print(f"File too large: {initials_file.size} bytes")
                    return JsonResponse({'error': 'File too large. Maximum size is 2MB.'}, status=400)
                
                # Convert to data URL so it renders without a media server
                content = initials_file.read()
                mime, _ = mimetypes.guess_type(initials_file.name)
                mime = mime or 'image/png'
                b64 = base64.b64encode(content).decode('ascii')
                data['initials_url'] = f"data:{mime};base64,{b64}"
                print(f"Generated initials_url with length: {len(data['initials_url'])}")
            except Exception as e:
                print(f"Error processing initials file: {e}")
                import traceback
                traceback.print_exc()
                return JsonResponse({'error': f'Error processing initials file: {str(e)}'}, status=400)

        # Flattened prior_hours fields from multipart -> build a dict
        prior_hours: dict[str, float] = {}
        for key in list(data.keys()):
            if key.startswith('prior_hours.'):
                field_name = key.split('.', 1)[1]
                try:
                    prior_hours[field_name] = float(data.get(key) or 0)
                except (TypeError, ValueError):
                    prior_hours[field_name] = 0
                data.pop(key, None)

        if prior_hours:
            # Provide as dict to JSONField, not a JSON string
            data['prior_hours'] = prior_hours

        print(f"Data after processing: {data}")

        # Only pass fields that the serializer accepts
        allowed_fields = {
            'organization', 'first_name', 'middle_name', 'last_name',
            'principal_supervisor', 'secondary_supervisor', 'supervisor_emails',
            'principal_supervisor_email', 'secondary_supervisor_email',
            'signature_url', 'initials_url', 'prior_hours',
            # Location & Contact Information
            'city', 'state', 'timezone', 'mobile',
            # Role-specific program fields (registration-locked fields removed)
            'aope', 'qualification_level', 'program_type',
            'target_weeks', 'weekly_commitment',
            # Supervisor-specific fields
            'is_board_approved_supervisor', 'supervisor_registration_date', 
            'can_supervise_provisionals', 'can_supervise_registrars', 'supervisor_welcome_seen',
            # Provisional psychologist-specific fields
            'provisional_registration_date', 'internship_start_date', 'is_full_time',
            'estimated_completion_weeks', 'weekly_commitment_hours',
            # First login tracking
            'first_login_completed',
            # Prior hours processing
            'prior_hours_declined', 'prior_hours_submitted'
        }
        cleaned = {k: v for k, v in data.items() if k in allowed_fields}
        print(f"Cleaned data after filtering: {cleaned}")
        print(f"first_login_completed in cleaned: {'first_login_completed' in cleaned}")

        # Check for supervisor email changes before saving
        old_principal_email = user_profile.principal_supervisor_email
        old_secondary_email = user_profile.secondary_supervisor_email
        
        try:
            serializer = UserProfileSerializer(user_profile, data=cleaned, partial=True)
            print(f"Serializer data being saved: {cleaned}")
            print(f"Serializer is valid: {serializer.is_valid()}")
            if serializer.is_valid():
                print("Serializer is valid, saving...")
                # Mark profile as completed when user saves it
                if not user_profile.profile_completed:
                    user_profile.profile_completed = True
                    user_profile.save()
                
                # Mark first login as completed when user saves their profile
                if not user_profile.first_login_completed:
                    user_profile.first_login_completed = True
                    user_profile.save()
                
                saved_profile = serializer.save()
                print(f"Profile saved successfully")
                print(f"Profile saved. Signature URL length: {len(saved_profile.signature_url) if saved_profile.signature_url else 0}")
                print(f"Profile saved. Initials URL length: {len(saved_profile.initials_url) if saved_profile.initials_url else 0}")
            else:
                print(f"Serializer validation failed: {serializer.errors}")
                print(f"Field errors: {serializer.errors}")
                return JsonResponse({'error': f'Validation failed: {serializer.errors}'}, status=400)
        except Exception as e:
            print(f"Error in serializer processing: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'Error in serializer processing: {str(e)}'}, status=400)
        
        # Check if supervisor emails changed and send notifications
        new_principal_email = cleaned.get('principal_supervisor_email')
        new_secondary_email = cleaned.get('secondary_supervisor_email')
        
        # Only send notifications for supervisees (provisional/registrar)
        if hasattr(request.user, 'profile') and request.user.profile.role in ['PROVISIONAL', 'REGISTRAR']:
            # Check principal supervisor email change
            if (new_principal_email and 
                new_principal_email != old_principal_email and 
                new_principal_email.strip()):
                supervisor_email = new_principal_email.strip()
                # Check if supervisor is registered
                try:
                    supervisor_user = User.objects.get(email__iexact=supervisor_email)
                    if hasattr(supervisor_user, 'profile') and supervisor_user.profile.role == 'SUPERVISOR':
                        # Supervisor is registered, send direct request
                        create_supervisor_request_message(request.user, supervisor_email, 'PRINCIPAL')
                    else:
                        # User exists but is not a supervisor, send invitation
                        create_supervisor_invitation_message(request.user, supervisor_email, supervisor_user.get_full_name(), 'PRINCIPAL')
                except User.DoesNotExist:
                    # Supervisor not registered, send invitation
                    create_supervisor_invitation_message(request.user, supervisor_email, '', 'PRINCIPAL')
            
            # Check secondary supervisor email change
            if (new_secondary_email and 
                new_secondary_email != old_secondary_email and 
                new_secondary_email.strip()):
                supervisor_email = new_secondary_email.strip()
                # Check if supervisor is registered
                try:
                    supervisor_user = User.objects.get(email__iexact=supervisor_email)
                    if hasattr(supervisor_user, 'profile') and supervisor_user.profile.role == 'SUPERVISOR':
                        # Supervisor is registered, send direct request
                        create_supervisor_request_message(request.user, supervisor_email, 'SECONDARY')
                    else:
                        # User exists but is not a supervisor, send invitation
                        create_supervisor_invitation_message(request.user, supervisor_email, supervisor_user.get_full_name(), 'SECONDARY')
                except User.DoesNotExist:
                    # Supervisor not registered, send invitation
                    create_supervisor_invitation_message(request.user, supervisor_email, '', 'SECONDARY')
        
        return Response(serializer.data)

@api_view(['POST'])
def password_reset_request(request):
    """Request a password reset token. Always return 200 to avoid user enumeration."""
    try:
        email = (request.data.get('email') or '').strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_link = f"/reset-password?uid={uid}&token={token}"
            # Demo: print to console; hook email provider later
            print(f"Password reset link for {email}: {reset_link}")
        payload = {'ok': True}
        # Include link in response during dev for easy testing
        if user:
            payload['reset_link'] = reset_link
        return Response(payload)
    except Exception:
        return Response({'ok': True})

@api_view(['POST'])
def password_reset_confirm(request):
    """Confirm password reset using uid and token, set a new password."""
    uidb64 = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    if not (uidb64 and token and new_password):
        return Response({'detail': 'Missing parameters'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except Exception:
        return Response({'detail': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
    if not default_token_generator.check_token(user, token):
        return Response({'detail': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_password)
    user.save()
    return Response({'ok': True})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Get current user information
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
        
        return Response({
            'id': request.user.id,
            'email': request.user.email,
            'role': user_profile.role,
            'first_name': user_profile.first_name,
            'last_name': user_profile.last_name,
            'organization': user_profile.organization.name if user_profile.organization else None,
            'profile_completed': user_profile.profile_completed,
            'first_login_completed': user_profile.first_login_completed,
            'supervisor_welcome_seen': user_profile.supervisor_welcome_seen
        })
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def register_terms_agree(request):
    """Step 1: User agrees to terms and conditions"""
    try:
        # TODO: Store terms agreement in database
        # For now, just return success
        return Response({'ok': True, 'message': 'Terms agreed successfully'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def register_details_submit(request):
    """Step 2: Submit registration details and send verification code"""
    try:
        data = request.data
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email', 'password', 'ahpra_registration_number', 'designation']
        for field in required_fields:
            if not data.get(field):
                return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Provisional start date is only required for provisional psychologists
        if data.get('designation') == 'PROVISIONAL' and not data.get('provisional_start_date'):
            return Response({'error': 'provisional_start_date is required for provisional psychologists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if email already exists
        if User.objects.filter(email__iexact=data['email']).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if AHPRA number already exists
        if UserProfile.objects.filter(ahpra_registration_number=data['ahpra_registration_number']).exists():
            return Response({'error': 'AHPRA registration number already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate designation
        if data['designation'] not in [choice[0] for choice in UserRole.choices]:
            return Response({'error': 'Invalid designation'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create verification code and store registration data
        verification_code = EmailVerificationCode.objects.create(
            email=data['email'],
            psy_number=data.get('ahpra_registration_number', ''),
            # Store registration data as JSON in a temporary field
            registration_data=data  # This will be stored as JSON
        )
        
        # TODO: Send verification email
        print(f"Verification code for {data['email']}: {verification_code.code}")
        print(f"Code expires at: {verification_code.expires_at}")
        
        return Response({
            'ok': True, 
            'message': 'Verification code sent to your email',
            'verification_code': verification_code.code  # For demo purposes
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def register_verify_code(request):
    """Step 3-4: Verify email code and create user account"""
    try:
        print(f"Raw request data: {request.data}")
        data = request.data
        email = data.get('email', '').strip().lower()
        psy_number = data.get('psy_number', '').strip()
        code = data.get('verification_code', '').strip()
        
        print(f"Verification attempt - Email: {email}, Code: {code}")
        
        if not all([email, code]):
            print("Missing email or code")
            return Response({'error': 'Email and verification code are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find verification code
        try:
            verification = EmailVerificationCode.objects.get(
                email=email,
                code=code,
                is_used=False
            )
            print(f"Found verification code: {verification.code}, Expires: {verification.expires_at}, Is expired: {verification.is_expired()}")
        except EmailVerificationCode.DoesNotExist:
            print(f"No verification code found for email: {email}, code: {code}")
            # List all codes for this email for debugging
            all_codes = EmailVerificationCode.objects.filter(email=email)
            print(f"All codes for {email}: {[(c.code, c.is_used, c.is_expired()) for c in all_codes]}")
            return Response({'error': 'Invalid verification code'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if code is expired
        if verification.is_expired():
            return Response({'error': 'Verification code has expired'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark code as used
        verification.is_used = True
        verification.save()
        
        # Get registration data from the verification code
        registration_data = verification.registration_data
        print(f"Registration data: {registration_data}")
        
        try:
            # Create user account with registration data
            from django.contrib.auth.models import User
            from .models import UserProfile, UserRole
            from django.db import transaction
            from django.utils.dateparse import parse_date
            from datetime import datetime
            import logging
            
            logger = logging.getLogger(__name__)
            
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                # User already exists, mark verification as used and return success
                verification.is_used = True
                verification.save()
                logger.info(f"User {email} already exists, marking verification as used")
                return Response({
                    'ok': True,
                    'message': 'Email verified successfully',
                    'next_step': 'subscription'
                })
            
            # Use database transaction to ensure atomicity
            with transaction.atomic():
                # Create user with registration data
                user = User.objects.create_user(
                    username=email,
                    email=email,
                    password=registration_data.get('password', 'demo_password_123'),
                    first_name=registration_data.get('first_name', ''),
                    last_name=registration_data.get('last_name', '')
                )
                
                # Process provisional_start_date if provided
                provisional_start_date = None
                if registration_data.get('provisional_start_date'):
                    start_date_str = registration_data.get('provisional_start_date')
                    try:
                        # Handle ISO format dates from frontend
                        if 'T' in start_date_str:
                            # Parse ISO format and convert to date
                            dt = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                            provisional_start_date = dt.date()
                        else:
                            # Parse standard date format
                            provisional_start_date = parse_date(start_date_str)
                    except (ValueError, TypeError) as e:
                        logger.error(f"Invalid date format for {email}: {start_date_str} - {e}")
                        raise ValueError(f"Invalid date format: {start_date_str}. Must be in YYYY-MM-DD format.")
                
                # Create user profile with registration data
                profile = UserProfile.objects.create(
                    user=user,
                    role=registration_data.get('designation', UserRole.SUPERVISOR),
                    first_name=registration_data.get('first_name', ''),
                    middle_name=registration_data.get('middle_name', ''),
                    last_name=registration_data.get('last_name', ''),
                    ahpra_registration_number=registration_data.get('ahpra_registration_number', psy_number or 'PSY0000000000'),
                    city=registration_data.get('city', ''),
                    state=registration_data.get('state', ''),
                    timezone=registration_data.get('timezone', ''),
                    mobile=registration_data.get('mobile', ''),
                    provisional_start_date=provisional_start_date,
                    profile_completed=False,
                    first_login_completed=False,
                )
                
                # Mark verification as used only after successful creation
                verification.is_used = True
                verification.save()
                
                logger.info(f"Successfully created user: {user.email} with profile ID: {profile.id}")
                print(f"Created user: {user.email} with profile ID: {profile.id}")
                print(f"Profile data: city={profile.city}, state={profile.state}, timezone={profile.timezone}, mobile={profile.mobile}")
            
        except Exception as e:
            logger.error(f"Failed to create user account for {email}: {str(e)}")
            print(f"Error creating user: {str(e)}")
            
            # Log the failure for audit purposes
            logger.error(f"VERIFICATION_FAILED: Email={email}, Error={str(e)}, RegistrationData={registration_data}")
            
            # Don't mark verification as used since creation failed
            return Response({
                'error': f'Failed to create user account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'ok': True,
            'message': 'Email verified successfully',
            'next_step': 'subscription'
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def register_complete(request):
    """Step 6: Complete registration after subscription"""
    try:
        print(f"Registration complete request data: {request.data}")
        data = request.data
        
        # Extract user data from the request
        email = data.get('email')
        password = data.get('password')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        middle_name = data.get('middle_name', '')
        designation = data.get('designation')
        ahpra_registration_number = data.get('ahpra_registration_number')
        provisional_start_date = data.get('provisional_start_date')
        subscription_plan = data.get('subscription_plan')
        
        # Convert ISO date string to date object
        if provisional_start_date:
            try:
                from datetime import datetime
                # Parse ISO format and convert to date object
                if 'T' in str(provisional_start_date):
                    # Extract just the date part (YYYY-MM-DD)
                    date_str = str(provisional_start_date).split('T')[0]
                    provisional_start_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                else:
                    # Already in correct format, convert to date object
                    provisional_start_date = datetime.strptime(str(provisional_start_date), '%Y-%m-%d').date()
            except (ValueError, AttributeError) as e:
                print(f"Error parsing date {provisional_start_date}: {e}")
                provisional_start_date = None
        
        print(f"Extracted data - Email: {email}, Designation: {designation}, AHPRA: {ahpra_registration_number}")
        
        if not all([email, password, first_name, last_name, designation, ahpra_registration_number]):
            return Response({'error': 'Missing required registration data'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already exists (from verification step)
        user = User.objects.filter(email=email).first()
        if user:
            print(f"User already exists: {email}")
            try:
                profile = user.profile
                print(f"Using existing profile with ID: {profile.id}")
            except:
                # User exists but no profile - create profile
                print(f"Creating profile for existing user: {email}")
                profile = UserProfile.objects.create(
                    user=user,
                    role=designation,
                    first_name=first_name,
                    middle_name=middle_name,
                    last_name=last_name,
                    ahpra_registration_number=ahpra_registration_number,
                    provisional_start_date=provisional_start_date,
                    profile_completed=False,
                    first_login_completed=False,
                )
                print(f"User profile created with ID: {profile.id}")
        else:
            # Create user (this should not happen in normal flow)
            print(f"Creating user with email: {email}")
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            print(f"User created with ID: {user.id}")
            
            # Create user profile
            print(f"Creating user profile with role: {designation}")
            profile = UserProfile.objects.create(
                user=user,
                role=designation,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                ahpra_registration_number=ahpra_registration_number,
                provisional_start_date=provisional_start_date,
                profile_completed=False,
                first_login_completed=False,
            )
            print(f"User profile created with ID: {profile.id}")
        
        return Response({
            'ok': True,
            'message': 'Registration completed successfully',
            'user_id': user.id
        })
        
    except IntegrityError as e:
        print(f"IntegrityError: {e}")
        return Response({'error': 'User already exists'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Exception in register_complete: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
@audit_data_access('PROGRAM_SUMMARY', 'UserProfile')
def program_summary(request):
    """
    Get role-scoped program summary with requirements and progress
    """
    try:
        user = request.user
        if not hasattr(user, 'profile'):
            return Response({'error': 'User profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        profile = user.profile
        role = profile.role
        program_type = profile.program_type or ('5+1' if role == 'PROVISIONAL' else 'registrar')
        
        # Get program requirements based on role and program type
        requirements = get_program_requirements(profile)
        
        # Get current progress
        progress = get_program_progress(profile)
        
        # Calculate pace estimates
        pace_estimates = calculate_pace_estimates(profile, progress, requirements)
        
        # Get alerts
        alerts = get_program_alerts(profile, progress, requirements)
        
        return Response({
            'role': role,
            'program_type': program_type,
            'requirements': requirements,
            'progress': progress,
            'pace_estimates': pace_estimates,
            'alerts': alerts,
            'profile_data': {
                'aope': profile.aope,
                'qualification_level': profile.qualification_level,
                'start_date': profile.start_date.isoformat() if profile.start_date else None,
                'target_weeks': profile.target_weeks,
                'weekly_commitment': float(profile.weekly_commitment) if profile.weekly_commitment else None,
            }
        })
        
    except Exception as e:
        print(f"Exception in program_summary: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_program_requirements(profile):
    """Get program requirements based on user profile"""
    requirements = settings.PROGRAM_REQUIREMENTS.get(profile.program_type or '5+1', {})
    
    # For registrar, get qualification-specific requirements
    if profile.program_type == 'registrar' and profile.qualification_level:
        qualification_reqs = requirements.get('qualifications', {}).get(profile.qualification_level, {})
        requirements.update(qualification_reqs)
    
    return requirements


def get_program_progress(profile):
    """Get current progress for all program categories"""
    try:
        from section_a.models import SectionAEntry
        from pd_app.models import ProfessionalDevelopmentEntry
        from section_c.models import SupervisionEntry
        
        # Get total hours for each category
        dcc_entries = SectionAEntry.objects.filter(
            trainee=profile.user,
            entry_type='client_contact'
        )
        cra_entries = SectionAEntry.objects.filter(
            trainee=profile.user,
            entry_type__in=['cra', 'icra']
        )
        pd_entries = ProfessionalDevelopmentEntry.objects.filter(
            trainee=profile.user
        )
        supervision_entries = SupervisionEntry.objects.filter(
            trainee=profile
        )
        
        # Calculate totals in hours
        dcc_hours = sum(entry.duration_minutes or 0 for entry in dcc_entries) / 60
        cra_hours = sum(entry.duration_minutes or 0 for entry in cra_entries) / 60
        pd_hours = sum(entry.duration_minutes or 0 for entry in pd_entries) / 60
        supervision_hours = sum(entry.duration_minutes or 0 for entry in supervision_entries) / 60
        
        # Calculate simulated DCC hours
        simulated_dcc_hours = sum(
            entry.duration_minutes or 0 
            for entry in dcc_entries.filter(simulated=True)
        ) / 60
        
        return {
            'dcc_hours': round(dcc_hours, 1),
            'cra_hours': round(cra_hours, 1),
            'pd_hours': round(pd_hours, 1),
            'supervision_hours': round(supervision_hours, 1),
            'simulated_dcc_hours': round(simulated_dcc_hours, 1),
            'total_practice_hours': round(dcc_hours + cra_hours, 1),
            'total_hours': round(dcc_hours + cra_hours + pd_hours + supervision_hours, 1),
        }
        
    except Exception as e:
        print(f"Error getting program progress: {e}")
        return {
            'dcc_hours': 0,
            'cra_hours': 0,
            'pd_hours': 0,
            'supervision_hours': 0,
            'simulated_dcc_hours': 0,
            'total_practice_hours': 0,
            'total_hours': 0,
        }


def calculate_pace_estimates(profile, progress, requirements):
    """Calculate pace estimates based on weekly commitment and progress"""
    if not profile.start_date or not profile.weekly_commitment:
        return {'estimated_completion': None, 'weeks_remaining': None, 'on_pace': None}
    
    weeks_elapsed = (date.today() - profile.start_date).days / 7
    expected_hours = weeks_elapsed * float(profile.weekly_commitment)
    actual_hours = progress['total_hours']
    
    # Calculate estimated completion
    if profile.weekly_commitment > 0:
        total_required = requirements.get('total_hours', 0) or requirements.get('practice_hours', 0)
        if total_required > 0:
            weeks_remaining = max(0, (total_required - actual_hours) / float(profile.weekly_commitment))
            estimated_completion = date.today() + timedelta(weeks=weeks_remaining)
        else:
            weeks_remaining = None
            estimated_completion = None
    else:
        weeks_remaining = None
        estimated_completion = None
    
    # Determine if on pace (within 20% of expected)
    on_pace = None
    if expected_hours > 0:
        pace_ratio = actual_hours / expected_hours
        on_pace = 0.8 <= pace_ratio <= 1.2
    
    return {
        'estimated_completion': estimated_completion.isoformat() if estimated_completion else None,
        'weeks_remaining': round(weeks_remaining, 1) if weeks_remaining else None,
        'on_pace': on_pace,
        'expected_hours': round(expected_hours, 1),
        'actual_hours': actual_hours,
        'pace_ratio': round(actual_hours / expected_hours, 2) if expected_hours > 0 else None,
    }


def get_program_alerts(profile, progress, requirements):
    """Get alerts based on progress vs requirements"""
    alerts = []
    
    # Simulated DCC overflow alert
    if profile.program_type == '5+1':
        max_simulated = requirements.get('max_simulated_dcc_hours', 60)
        if progress['simulated_dcc_hours'] > max_simulated:
            alerts.append({
                'type': 'warning',
                'message': f"Simulated DCC hours ({progress['simulated_dcc_hours']:.1f}) exceed the maximum countable amount ({max_simulated}h). Excess hours won't count toward registration.",
                'category': 'simulated_dcc'
            })
    
    # Annual PD alert
    current_year_start = date.today().replace(month=1, day=1)
    try:
        from pd_app.models import ProfessionalDevelopmentEntry
        annual_pd_minutes = ProfessionalDevelopmentEntry.objects.filter(
            trainee=profile.user,
            date_of_activity__gte=current_year_start
        ).aggregate(Sum('duration_minutes'))['duration_minutes__sum'] or 0
        annual_pd_hours = annual_pd_minutes / 60
        
        pd_target = settings.PROVISIONAL_PD_ANNUAL_HOURS_REQUIRED if profile.role == 'PROVISIONAL' else settings.REGISTRAR_PD_ANNUAL_HOURS_REQUIRED
        if annual_pd_hours < pd_target:
            alerts.append({
                'type': 'warning',
                'message': f"Annual PD hours ({annual_pd_hours:.1f}) are below the required {pd_target}h for your role this year.",
                'category': 'annual_pd'
            })
    except Exception:
        pass  # Skip PD alert if there's an error
    
    # Supervision ratio alert
    if profile.program_type == '5+1':
        practice_hours = progress['total_practice_hours']
        supervision_hours = progress['supervision_hours']
        if practice_hours > 0:
            ratio = supervision_hours / practice_hours
            if ratio < (1/17):  # 1 hour supervision per 17 hours practice
                alerts.append({
                    'type': 'warning',
                    'message': f"Supervision ratio ({ratio:.3f}) is below the recommended 1:17 ratio (1 hour supervision per 17 hours practice).",
                    'category': 'supervision_ratio'
                })
    
    return alerts


# Messaging System Views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def messages(request):
    """Get messages for the authenticated user or send a new message"""
    if request.method == 'GET':
        # Get messages for the current user
        messages = Message.objects.filter(recipient=request.user)
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Send a new message
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(sender=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
@support_error_handler
def message_detail(request, message_id):
    """Get or update a specific message"""
    try:
        message = Message.objects.get(id=message_id, recipient=request.user)
    except Message.DoesNotExist:
        return Response({'error': 'Message not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = MessageSerializer(message)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        # Mark as read or update status
        serializer = MessageSerializer(message, data=request.data, partial=True)
        if serializer.is_valid():
            if 'status' in request.data and request.data['status'] == 'READ':
                from django.utils import timezone
                serializer.save(read_at=timezone.now())
            else:
                serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervisor_requests(request):
    """Get supervisor requests or create a new one"""
    if request.method == 'GET':
        # Get supervisor requests for the current user
        requests = SupervisorRequest.objects.filter(supervisor=request.user)
        serializer = SupervisorRequestSerializer(requests, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create a new supervisor request (only for supervisees)
        if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
            return Response({'error': 'Only supervisees can send supervisor requests'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = SupervisorRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(trainee=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervisor_request_response(request, request_id):
    """Respond to a supervisor request (accept/decline)"""
    try:
        supervisor_request = SupervisorRequest.objects.get(id=request_id, supervisor=request.user)
    except SupervisorRequest.DoesNotExist:
        return Response({'error': 'Supervisor request not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if supervisor_request.status != 'PENDING':
        return Response({'error': 'Request has already been responded to'}, status=status.HTTP_400_BAD_REQUEST)
    
    new_status = request.data.get('status')
    if new_status not in ['ACCEPTED', 'DECLINED']:
        return Response({'error': 'Status must be ACCEPTED or DECLINED'}, status=status.HTTP_400_BAD_REQUEST)
    
    from django.utils import timezone
    supervisor_request.status = new_status
    supervisor_request.responded_at = timezone.now()
    supervisor_request.save()
    
    # Update the message status
    supervisor_request.message.status = 'READ'
    supervisor_request.message.save()
    
    serializer = SupervisorRequestSerializer(supervisor_request)
    return Response(serializer.data)


def create_supervisor_request_message(supervisee, supervisor_email, capacity):
    """Helper function to create supervisor request message"""
    from django.contrib.auth.models import User
    from django.utils import timezone
    from .models import Message, SupervisorRequest, SupervisorEndorsement
    
    try:
        supervisor_user = User.objects.get(email=supervisor_email)
    except User.DoesNotExist:
        return None  # Supervisor not found
    
    # Check if supervisor has SUPERVISOR role
    if not hasattr(supervisor_user, 'profile') or supervisor_user.profile.role != 'SUPERVISOR':
        return None  # User is not a supervisor
    
    # Check endorsement compatibility for registrars
    if hasattr(supervisee, 'profile') and supervisee.profile.role == 'REGISTRAR':
        supervisee_endorsement = supervisee.profile.aope
        if supervisee_endorsement:
            # Check if supervisor has the matching endorsement
            supervisor_has_endorsement = SupervisorEndorsement.objects.filter(
                supervisor=supervisor_user,
                endorsement=supervisee_endorsement,
                is_active=True
            ).exists()
            
            if not supervisor_has_endorsement:
                # Create a message to the supervisee about endorsement mismatch
                Message.objects.create(
                    sender=supervisor_user,  # System message from supervisor
                    recipient=supervisee,
                    message_type='SYSTEM_NOTIFICATION',
                    subject=f'Supervision Request - Endorsement Mismatch',
                    content=f"""
Dear {supervisee.profile.first_name},

Your request for supervision from {supervisor_user.profile.first_name} {supervisor_user.profile.last_name} could not be processed.

Issue: The supervisor does not have the required endorsement to supervise registrars in the {supervisee_endorsement} area of practice.

Please select a supervisor who has the {supervisee_endorsement} endorsement, or contact the supervisor to add this endorsement to their profile.

Best regards,
PsychPATH System
""",
                    status='UNREAD'
                )
                return None  # Cannot create supervision request
    
    # Create the message
    capacity_display = "Principal Supervisor" if capacity == "PRINCIPAL" else "Secondary Supervisor"
    subject = f"Supervision Request from {trainee.profile.first_name} {trainee.profile.last_name}"
    content = f"""
Dear {supervisor_user.profile.first_name or 'Supervisor'},

{trainee.profile.first_name} {trainee.profile.last_name} ({trainee.email}) has requested you to serve as their {capacity_display.lower()}.

Trainee Details:
- Name: {trainee.profile.first_name} {trainee.profile.last_name}
- Email: {trainee.email}
- Role: {trainee.profile.role}
- AHPRA Number: {trainee.profile.ahpra_registration_number}

Please review this request and respond by accepting or declining the supervision role.

Best regards,
PsychPATH System
"""
    
    message = Message.objects.create(
        sender=trainee,
        recipient=supervisor_user,
        message_type='SUPERVISOR_REQUEST',
        subject=subject,
        content=content,
        status='UNREAD'
    )
    
    # Create the supervisor request
    supervisor_request = SupervisorRequest.objects.create(
        trainee=trainee,
        supervisor=supervisor_user,
        capacity=capacity,
        message=message,
        status='PENDING'
    )
    
    return supervisor_request


def create_supervisor_invitation_message(trainee, supervisor_email, supervisor_name, capacity):
    """Helper function to create supervisor invitation message"""
    from django.contrib.auth.models import User
    from django.utils import timezone
    from django.utils.crypto import get_random_string
    from .models import Message, SupervisorInvitation
    
    # Generate unique invitation token
    invitation_token = get_random_string(32)
    
    # Set expiration date (7 days from now)
    expires_at = timezone.now() + timezone.timedelta(days=7)
    
    # Create the message
    capacity_display = "Principal Supervisor" if capacity == "PRINCIPAL" else "Secondary Supervisor"
    subject = f"Supervision Invitation from {trainee.profile.first_name} {trainee.profile.last_name}"
    content = f"""
Dear {supervisor_name or 'Potential Supervisor'},

{trainee.profile.first_name} {trainee.profile.last_name} ({trainee.email}) has invited you to serve as their {capacity_display.lower()} through the PsychPATH (Psychology Professional Assessment and Training Hub) system.

Trainee Details:
- Name: {trainee.profile.first_name} {trainee.profile.last_name}
- Email: {trainee.email}
- Role: {trainee.profile.role}
- AHPRA Number: {trainee.profile.ahpra_registration_number}

To accept this invitation and create your supervisor account, please visit:
http://localhost:5174/invitation/{invitation_token}

This invitation will expire on {expires_at.strftime('%B %d, %Y at %I:%M %p')}.

If you are unable to supervise this trainee, please ignore this invitation.

Best regards,
PsychPATH System
"""
    
    # Create the invitation first (without message)
    invitation = SupervisorInvitation.objects.create(
        trainee=trainee,
        supervisor_email=supervisor_email,
        supervisor_name=supervisor_name or '',
        capacity=capacity,
        invitation_token=invitation_token,
        expires_at=expires_at,
        status='PENDING'
    )
    
    # Create the message (we'll create a system message since there's no recipient user yet)
    message = Message.objects.create(
        sender=trainee,
        recipient=trainee,  # Temporary - will be updated when supervisor registers
        message_type='SYSTEM_NOTIFICATION',
        subject=f"Invitation sent to {supervisor_email}",
        content=f"You have invited {supervisor_name or supervisor_email} to be your {capacity_display.lower()}. They will receive an email with registration instructions.",
        status='READ'
    )
    
    # Link the message to the invitation
    invitation.message = message
    invitation.save()
    
    return invitation


@api_view(['GET'])
def supervisor_invitation_detail(request, token):
    """Get invitation details by token (public endpoint for unregistered supervisors)"""
    try:
        invitation = SupervisorInvitation.objects.get(invitation_token=token)
    except SupervisorInvitation.DoesNotExist:
        return Response({'error': 'Invitation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not invitation.is_valid():
        return Response({'error': 'Invitation has expired or is no longer valid'}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = SupervisorInvitationSerializer(invitation)
    return Response(serializer.data)


@api_view(['POST'])
def supervisor_invitation_accept(request, token):
    """Accept supervisor invitation and create account (public endpoint)"""
    try:
        invitation = SupervisorInvitation.objects.get(invitation_token=token)
    except SupervisorInvitation.DoesNotExist:
        return Response({'error': 'Invitation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not invitation.is_valid():
        return Response({'error': 'Invitation has expired or is no longer valid'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Extract registration data from request
    email = request.data.get('email')
    password = request.data.get('password')
    first_name = request.data.get('first_name')
    last_name = request.data.get('last_name')
    
    if not all([email, password, first_name, last_name]):
        return Response({'error': 'Missing required fields: email, password, first_name, last_name'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Check if email matches invitation
    if email.lower() != invitation.supervisor_email.lower():
        return Response({'error': 'Email does not match invitation'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user already exists
    if User.objects.filter(email__iexact=email).exists():
        return Response({'error': 'User with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Create the supervisor user
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        
        # Create supervisor profile
        from .models import UserProfile
        from django.utils import timezone
        UserProfile.objects.create(
            user=user,
            role='SUPERVISOR',
            first_name=first_name,
            last_name=last_name,
            ahpra_registration_number='',  # Will be filled in later
            provisional_start_date=timezone.now().date()  # Required field
        )
        
        # Update invitation status
        from django.utils import timezone
        invitation.status = 'ACCEPTED'
        invitation.responded_at = timezone.now()
        invitation.save()
        
        # Update the message recipient
        invitation.message.recipient = user
        invitation.message.save()
        
        # Create a new supervisor request to link the accepted invitation
        SupervisorRequest.objects.create(
            trainee=invitation.trainee,
            supervisor=user,
            capacity=invitation.capacity,
            status='ACCEPTED',
            responded_at=timezone.now(),
            message=invitation.message
        )
        
        return Response({
            'message': 'Account created successfully',
            'user_id': user.id,
            'invitation_accepted': True
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': f'Failed to create account: {str(e)}'}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervisor_invitations(request):
    """Get supervisor invitations sent by the authenticated user"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only supervisees can view invitations'}, status=status.HTTP_403_FORBIDDEN)
    
    invitations = SupervisorInvitation.objects.filter(trainee=request.user)
    serializer = SupervisorInvitationSerializer(invitations, many=True)
    return Response(serializer.data)


# Supervisor Endorsement Views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervisor_endorsements(request):
    """Get or create supervisor endorsements"""
    if request.method == 'GET':
        # Get endorsements for the current user
        endorsements = SupervisorEndorsement.objects.filter(supervisor=request.user)
        serializer = SupervisorEndorsementSerializer(endorsements, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create a new endorsement (only for supervisors)
        if not hasattr(request.user, 'profile') or request.user.profile.role != 'SUPERVISOR':
            return Response({'error': 'Only supervisors can manage endorsements'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = SupervisorEndorsementSerializer(data=request.data)
        if serializer.is_valid():
            try:
                serializer.save(supervisor=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except IntegrityError as e:
                if 'unique constraint' in str(e).lower() and 'endorsement' in str(e).lower():
                    return Response({
                        'endorsement': ['You already have this endorsement type. Each endorsement can only be added once.']
                    }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    raise e
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervisor_endorsement_detail(request, endorsement_id):
    """Get, update, or delete a specific endorsement"""
    try:
        endorsement = SupervisorEndorsement.objects.get(id=endorsement_id, supervisor=request.user)
    except SupervisorEndorsement.DoesNotExist:
        return Response({'error': 'Endorsement not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = SupervisorEndorsementSerializer(endorsement)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = SupervisorEndorsementSerializer(endorsement, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        endorsement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def available_supervisors(request):
    """Get available supervisors for a specific endorsement"""
    endorsement = request.GET.get('endorsement')
    if not endorsement:
        return Response({'error': 'Endorsement parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get supervisors who have the specified endorsement and are active
    supervisors = SupervisorEndorsement.objects.filter(
        endorsement=endorsement,
        is_active=True
    ).select_related('supervisor', 'supervisor__profile')
    
    # Format response
    supervisor_list = []
    for endorsement_obj in supervisors:
        supervisor_list.append({
            'id': endorsement_obj.supervisor.id,
            'name': f"{endorsement_obj.supervisor.profile.first_name} {endorsement_obj.supervisor.profile.last_name}",
            'email': endorsement_obj.supervisor.email,
            'endorsement': endorsement_obj.endorsement,
            'endorsement_date': endorsement_obj.endorsement_date
        })
    
    return Response(supervisor_list)


# === SUPERVISION MANAGEMENT VIEWS ===

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervision_invite(request):
    """Invite supervisees to supervision relationship"""
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'SUPERVISOR':
        return Response({'error': 'Only supervisors can invite supervisees'}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = SupervisionInviteSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    emails = serializer.validated_data['emails']
    role = serializer.validated_data['role']
    
    # Check rate limiting (max 10 invites per day)
    today = timezone.now().date()
    today_invites = Supervision.objects.filter(
        supervisor=request.user,
        created_at__date=today
    ).count()
    
    if today_invites + len(emails) > 10:
        return Response({
            'error': 'Rate limit exceeded. Maximum 10 invitations per day.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    results = []
    errors = []
    
    for email in emails:
        try:
            # Check if user exists
            try:
                user = User.objects.get(email=email)
                user_exists = True
            except User.DoesNotExist:
                user_exists = False
            
            # Check if supervision relationship already exists
            existing_supervision = Supervision.objects.filter(
                supervisor=request.user,
                supervisee_email=email,
                role=role
            ).first()
            
            if existing_supervision:
                if existing_supervision.status == 'PENDING':
                    errors.append(f"Invitation already pending for {email}")
                    continue
                elif existing_supervision.status == 'ACCEPTED':
                    errors.append(f"Supervision relationship already exists for {email}")
                    continue
                elif existing_supervision.status in ['REJECTED', 'EXPIRED']:
                    # Update the existing rejected/expired invitation to PENDING
                    existing_supervision.status = 'PENDING'
                    existing_supervision.created_at = timezone.now()
                    existing_supervision.expires_at = timezone.now() + timezone.timedelta(days=7)
                    existing_supervision.accepted_at = None
                    existing_supervision.rejected_at = None
                    existing_supervision.supervisee = user if user_exists else None
                    existing_supervision.save()
                    
                    # Create notification record
                    SupervisionNotification.objects.create(
                        supervision=existing_supervision,
                        notification_type='INVITE_SENT',
                        email_sent=True,
                        in_app_sent=user_exists
                    )
                    
                    # Send email notification
                    send_supervision_invite_email(existing_supervision, user_exists)
                    
                    results.append({
                        'email': email,
                        'status': 'invited',
                        'user_exists': user_exists,
                        'supervision_id': existing_supervision.id
                    })
                    continue
            
            # Create supervision invitation
            supervision = Supervision.objects.create(
                supervisor=request.user,
                supervisee=user if user_exists else None,
                supervisee_email=email,
                role=role
            )
            
            # Create notification record
            SupervisionNotification.objects.create(
                supervision=supervision,
                notification_type='INVITE_SENT',
                email_sent=True,
                in_app_sent=user_exists
            )
            
            # Send email notification
            send_supervision_invite_email(supervision, user_exists)
            
            results.append({
                'email': email,
                'status': 'invited',
                'user_exists': user_exists,
                'supervision_id': supervision.id
            })
            
        except Exception as e:
            errors.append(f"Error inviting {email}: {str(e)}")
    
    return Response({
        'results': results,
        'errors': errors,
        'message': f"Processed {len(emails)} invitations"
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervision_list(request):
    """Get list of supervision relationships for the current user"""
    if hasattr(request.user, 'profile') and request.user.profile.role == 'SUPERVISOR':
        # Supervisor view - show all their invitations
        supervisions = Supervision.objects.filter(supervisor=request.user)
    else:
        # Supervisee view - show invitations received
        supervisions = Supervision.objects.filter(supervisee=request.user)
    
    serializer = SupervisionSerializer(supervisions, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervision_respond(request):
    """Respond to a supervision invitation"""
    serializer = SupervisionResponseSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    token = serializer.validated_data['token']
    action = serializer.validated_data['action']
    
    try:
        supervision = Supervision.objects.get(verification_token=token)
    except Supervision.DoesNotExist:
        return Response({'error': 'Invalid invitation token'}, status=status.HTTP_404_NOT_FOUND)
    
    if not supervision.can_be_accepted():
        return Response({'error': 'Invitation has expired or is no longer valid'}, status=status.HTTP_400_BAD_REQUEST)
    
    if action == 'accept':
        supervision.status = 'ACCEPTED'
        supervision.accepted_at = timezone.now()
        supervision.supervisee = request.user
        supervision.save()
        
        # Create notification
        SupervisionNotification.objects.create(
            supervision=supervision,
            notification_type='ACCEPTED',
            in_app_sent=True
        )
        
        # Send email notification to supervisor
        send_supervision_response_email(supervision, 'accepted')
        
    elif action == 'reject':
        supervision.status = 'REJECTED'
        supervision.rejected_at = timezone.now()
        supervision.save()
        
        # Create notification
        SupervisionNotification.objects.create(
            supervision=supervision,
            notification_type='REJECTED',
            in_app_sent=True
        )
        
        # Send email notification to supervisor
        send_supervision_response_email(supervision, 'rejected')
    
    serializer = SupervisionSerializer(supervision)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervision_pending_requests(request):
    """Get pending supervision requests for the current user"""
    if not hasattr(request.user, 'profile') or request.user.profile.role not in ['PROVISIONAL', 'REGISTRAR']:
        return Response({'error': 'Only supervisees can view pending requests'}, status=status.HTTP_403_FORBIDDEN)
    
    pending_requests = Supervision.objects.filter(
        supervisee=request.user,
        status='PENDING'
    )
    
    # Filter out expired invitations in Python since can_be_accepted is a method
    valid_requests = [s for s in pending_requests if s.can_be_accepted()]
    
    serializer = SupervisionSerializer(valid_requests, many=True)
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervision_cancel(request, supervision_id):
    """Cancel a supervision invitation (supervisor only)"""
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'SUPERVISOR':
        return Response({'error': 'Only supervisors can cancel invitations'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        supervision = Supervision.objects.get(
            id=supervision_id,
            supervisor=request.user,
            status='PENDING'
        )
    except Supervision.DoesNotExist:
        return Response({'error': 'Supervision invitation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    supervision.status = 'REJECTED'
    supervision.rejected_at = timezone.now()
    supervision.save()
    
    return Response({'message': 'Invitation cancelled successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@support_error_handler
def supervision_stats(request):
    """Get supervision statistics for the current user"""
    if not hasattr(request.user, 'profile') or request.user.profile.role != 'SUPERVISOR':
        return Response({'error': 'Only supervisors can view statistics'}, status=status.HTTP_403_FORBIDDEN)
    
    stats = {
        'total_invitations': Supervision.objects.filter(supervisor=request.user).count(),
        'pending_invitations': Supervision.objects.filter(supervisor=request.user, status='PENDING').count(),
        'accepted_invitations': Supervision.objects.filter(supervisor=request.user, status='ACCEPTED').count(),
        'rejected_invitations': Supervision.objects.filter(supervisor=request.user, status='REJECTED').count(),
        'expired_invitations': Supervision.objects.filter(supervisor=request.user, status='EXPIRED').count(),
        'primary_supervisions': Supervision.objects.filter(supervisor=request.user, role='PRIMARY', status='ACCEPTED').count(),
        'secondary_supervisions': Supervision.objects.filter(supervisor=request.user, role='SECONDARY', status='ACCEPTED').count(),
    }
    
    return Response(stats)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@support_error_handler
@audit_data_access('SUPERVISION_ASSIGNMENT', 'SupervisionAssignment')
def supervision_assignments(request):
    """
    Get or create supervision assignments for provisional psychologists
    """
    try:
        user_profile = UserProfile.objects.get(user=request.user)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        # Get existing supervision assignments for the user
        assignments = SupervisionAssignment.objects.filter(provisional=request.user)
        serializer = SupervisionAssignmentSerializer(assignments, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Only provisional psychologists can create supervision assignments
        if user_profile.role != UserRole.PROVISIONAL:
            return Response({'error': 'Only provisional psychologists can assign supervisors'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate the request data
        serializer = SupervisionAssignmentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if assignments already exist
        existing_assignments = SupervisionAssignment.objects.filter(provisional=request.user)
        if existing_assignments.exists():
            return Response({'error': 'Supervision assignments already exist for this user'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the supervision assignments
        try:
            # Create primary supervisor assignment
            primary_assignment = SupervisionAssignment.objects.create(
                provisional=request.user,
                supervisor_name=serializer.validated_data['primary_supervisor_name'],
                supervisor_email=serializer.validated_data['primary_supervisor_email'],
                role='PRIMARY'
            )
            
            # Check if primary supervisor exists in the system
            try:
                primary_supervisor_user = User.objects.get(email=serializer.validated_data['primary_supervisor_email'])
                primary_assignment.supervisor_user = primary_supervisor_user
                primary_assignment.save()
            except User.DoesNotExist:
                pass  # Supervisor not in system yet
            
            # Create secondary supervisor assignment
            secondary_assignment = SupervisionAssignment.objects.create(
                provisional=request.user,
                supervisor_name=serializer.validated_data['secondary_supervisor_name'],
                supervisor_email=serializer.validated_data['secondary_supervisor_email'],
                role='SECONDARY'
            )
            
            # Check if secondary supervisor exists in the system
            try:
                secondary_supervisor_user = User.objects.get(email=serializer.validated_data['secondary_supervisor_email'])
                secondary_assignment.supervisor_user = secondary_supervisor_user
                secondary_assignment.save()
            except User.DoesNotExist:
                pass  # Supervisor not in system yet
            
            # Log the supervision assignment creation
            log_supervision_action(
                user=request.user,
                action='SUPERVISION_ASSIGNMENT_CREATED',
                provisional_email=request.user.email,
                details={
                    'primary_supervisor': serializer.validated_data['primary_supervisor_name'],
                    'primary_supervisor_email': serializer.validated_data['primary_supervisor_email'],
                    'secondary_supervisor': serializer.validated_data['secondary_supervisor_name'],
                    'secondary_supervisor_email': serializer.validated_data['secondary_supervisor_email']
                }
            )
            
            # Return the created assignments
            assignments = SupervisionAssignment.objects.filter(provisional=request.user)
            response_serializer = SupervisionAssignmentSerializer(assignments, many=True)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': f'Failed to create supervision assignments: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Create your views here.