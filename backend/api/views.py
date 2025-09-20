from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import UserProfile, EmailVerificationCode, UserRole
from .serializers import UserProfileSerializer
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
import base64
import mimetypes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db import IntegrityError
import json
from logging_utils import support_error_handler, audit_data_access, log_data_access

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
        user_profile = UserProfile.objects.get(user=request.user)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(user_profile)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        # Handle file uploads for signature
        data = request.data.copy()

        # Handle signature file upload (demo: store filename)
        if 'signature' in request.FILES:
            signature_file = request.FILES['signature']
            # Convert to data URL so it renders without a media server
            content = signature_file.read()
            mime, _ = mimetypes.guess_type(signature_file.name)
            mime = mime or 'image/png'
            b64 = base64.b64encode(content).decode('ascii')
            data['signature_url'] = f"data:{mime};base64,{b64}"

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

        # Only pass fields that the serializer accepts
        allowed_fields = {
            'organization', 'first_name', 'middle_name', 'last_name',
            'ahpra_registration_number', 'intern_start_date', 'report_start_day',
            'principal_supervisor', 'secondary_supervisor', 'supervisor_emails',
            'signature_url', 'prior_hours'
        }
        cleaned = {k: v for k, v in data.items() if k in allowed_fields}

        serializer = UserProfileSerializer(user_profile, data=cleaned, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
            'organization': user_profile.organization.name if user_profile.organization else None
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
        required_fields = ['first_name', 'last_name', 'email', 'password', 'ahpra_registration_number', 'designation', 'internship_start_date', 'report_start_day']
        for field in required_fields:
            if not data.get(field):
                return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if email already exists
        if User.objects.filter(email__iexact=data['email']).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if AHPRA number already exists
        if UserProfile.objects.filter(ahpra_registration_number=data['ahpra_registration_number']).exists():
            return Response({'error': 'AHPRA registration number already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate designation
        if data['designation'] not in [choice[0] for choice in UserRole.choices]:
            return Response({'error': 'Invalid designation'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create verification code
        verification_code = EmailVerificationCode.objects.create(
            email=data['email'],
            psy_number=data.get('psy_number', '')
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
        
        # Get registration data from session or request
        # For now, we'll need to store this data temporarily
        # TODO: Implement proper session storage for registration data
        
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
        internship_start_date = data.get('internship_start_date')
        report_start_day = data.get('report_start_day')
        subscription_plan = data.get('subscription_plan')
        
        # Convert ISO date string to YYYY-MM-DD format
        if internship_start_date:
            from datetime import datetime
            try:
                # Parse ISO format and convert to date
                if 'T' in str(internship_start_date):
                    # Extract just the date part (YYYY-MM-DD)
                    internship_start_date = str(internship_start_date).split('T')[0]
                else:
                    # Already in correct format
                    internship_start_date = str(internship_start_date)
            except (ValueError, AttributeError):
                # If parsing fails, try to extract just the date part
                if 'T' in str(internship_start_date):
                    internship_start_date = str(internship_start_date).split('T')[0]
        
        print(f"Extracted data - Email: {email}, Designation: {designation}, AHPRA: {ahpra_registration_number}")
        
        if not all([email, password, first_name, last_name, designation, ahpra_registration_number]):
            return Response({'error': 'Missing required registration data'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user
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
            intern_start_date=internship_start_date,
            report_start_day=report_start_day
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


# Create your views here.