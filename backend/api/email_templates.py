"""
Email templates for supervision invitations and notifications
"""

def get_supervision_invite_email_template(supervision, user_exists=True):
    """Generate email content for supervision invitations"""
    supervisor_name = f"{supervision.supervisor.profile.first_name} {supervision.supervisor.profile.last_name}"
    role_text = "Primary" if supervision.role == "PRIMARY" else "Secondary"
    
    if user_exists:
        subject = f"Supervision Request from {supervisor_name}"
        body = f"""
Dear Trainee,

You have received a supervision request from {supervisor_name} to be your {role_text} Supervisor.

Please log in to your PsychPATH dashboard to accept or reject this request.

Request Details:
- Supervisor: {supervisor_name}
- Role: {role_text} Supervisor
- Invited: {supervision.created_at.strftime('%d %B %Y')}
- Expires: {supervision.expires_at.strftime('%d %B %Y')}

This invitation will expire in 7 days if no action is taken.

Best regards,
PsychPATH System
        """
    else:
        subject = f"Invitation to Join PsychPATH - Supervision Request from {supervisor_name}"
        body = f"""
Dear Future PsychPATH User,

You have been invited to join PsychPATH (Psychology Professional Assessment and Training Hub) by {supervisor_name} to be your {role_text} Supervisor.

PsychPATH is a comprehensive platform for provisional psychologists and registrars to track their training progress, log hours, and meet AHPRA requirements.

To accept this invitation and create your account, please click the link below:
[Registration Link with Token: {supervision.verification_token}]

Request Details:
- Supervisor: {supervisor_name}
- Role: {role_text} Supervisor
- Invited: {supervision.created_at.strftime('%d %B %Y')}
- Expires: {supervision.expires_at.strftime('%d %B %Y')}

This invitation will expire in 7 days if no action is taken.

Best regards,
PsychPATH System
        """
    
    return {
        'subject': subject,
        'body': body.strip()
    }


def get_supervision_response_email_template(supervision, action):
    """Generate email content for supervision responses"""
    supervisor_name = f"{supervision.supervisor.profile.first_name} {supervision.supervisor.profile.last_name}"
    trainee_name = f"{supervision.supervisee.profile.first_name} {supervision.supervisee.profile.last_name}"
    role_text = "Primary" if supervision.role == "PRIMARY" else "Secondary"
    
    if action == 'accepted':
        subject = f"Supervision Request Accepted - {trainee_name}"
        body = f"""
Dear {supervisor_name},

Great news! {trainee_name} has accepted your supervision request.

Supervision Details:
- Trainee: {trainee_name}
- Role: {role_text} Supervisor
- Accepted: {supervision.accepted_at.strftime('%d %B %Y at %H:%M')}

You can now view their progress and provide supervision through your PsychPATH dashboard.

Best regards,
PsychPATH System
        """
    else:  # rejected
        subject = f"Supervision Request Declined - {trainee_name}"
        body = f"""
Dear {supervisor_name},

{trainee_name} has declined your supervision request.

Request Details:
- Trainee: {trainee_name}
- Role: {role_text} Supervisor
- Declined: {supervision.rejected_at.strftime('%d %B %Y at %H:%M')}

You may wish to contact them directly to discuss alternative arrangements.

Best regards,
PsychPATH System
        """
    
    return {
        'subject': subject,
        'body': body.strip()
    }


def get_supervision_reminder_email_template(supervision):
    """Generate email content for supervision reminders"""
    supervisor_name = f"{supervision.supervisor.profile.first_name} {supervision.supervisor.profile.last_name}"
    role_text = "Primary" if supervision.role == "PRIMARY" else "Secondary"
    
    subject = f"Reminder: Supervision Request from {supervisor_name}"
    body = f"""
Dear Trainee,

This is a reminder that you have a pending supervision request from {supervisor_name}.

Request Details:
- Supervisor: {supervisor_name}
- Role: {role_text} Supervisor
- Invited: {supervision.created_at.strftime('%d %B %Y')}
- Expires: {supervision.expires_at.strftime('%d %B %Y')}

Please log in to your PsychPATH dashboard to accept or reject this request before it expires.

Best regards,
PsychPATH System
        """
    
    return {
        'subject': subject,
        'body': body.strip()
    }


def get_supervision_expired_email_template(supervision):
    """Generate email content for expired supervision invitations"""
    supervisor_name = f"{supervision.supervisor.profile.first_name} {supervision.supervisor.profile.last_name}"
    role_text = "Primary" if supervision.role == "PRIMARY" else "Secondary"
    
    subject = f"Supervision Request Expired - {supervision.supervisee_email}"
    body = f"""
Dear {supervisor_name},

The supervision request you sent to {supervision.supervisee_email} has expired without a response.

Request Details:
- Trainee Email: {supervision.supervisee_email}
- Role: {role_text} Supervisor
- Invited: {supervision.created_at.strftime('%d %B %Y')}
- Expired: {supervision.expires_at.strftime('%d %B %Y')}

You may wish to contact them directly or send a new invitation.

Best regards,
PsychPATH System
        """
    
    return {
        'subject': subject,
        'body': body.strip()
    }

def get_supervision_removal_email_template(supervision, supervisee_email):
    """Generate email content for supervision removal notifications"""
    supervisor_name = f"{supervision.supervisor.profile.first_name} {supervision.supervisor.profile.last_name}"
    role_text = "Primary" if supervision.role == "PRIMARY" else "Secondary"
    
    subject = f"Supervision Relationship Ended - {supervisor_name}"
    body = f"""
Dear Trainee,

Your supervision relationship with {supervisor_name} as your {role_text} Supervisor has been ended.

This means:
- You will no longer receive supervision from {supervisor_name}
- Your profile has been updated to remove this supervisor relationship
- You may need to find a new {role_text.lower()} supervisor to continue your training

Relationship Details:
- Supervisor: {supervisor_name}
- Role: {role_text} Supervisor
- Ended: {supervision.rejected_at.strftime('%d %B %Y')}

If you have any questions about this change, please contact your supervisor directly or reach out to our support team.

Best regards,
PsychPATH System
    """
    
    return {
        'subject': subject,
        'body': body.strip()
    }

def get_disconnection_request_email_template(disconnection_request):
    """Generate email content for disconnection requests"""
    supervisee_name = f"{disconnection_request.supervisee.profile.first_name} {disconnection_request.supervisee.profile.last_name}"
    supervisor_name = f"{disconnection_request.supervisor.profile.first_name} {disconnection_request.supervisor.profile.last_name}"
    role_text = "Primary" if disconnection_request.role == "PRIMARY" else "Secondary"
    
    subject = f"Disconnection Request from {supervisee_name}"
    body = f"""
Dear {supervisor_name},

You have received a disconnection request from {supervisee_name} regarding your {role_text} supervision relationship.

Request Details:
- Supervisee: {supervisee_name}
- Role: {role_text} Supervisor
- Requested: {disconnection_request.requested_at.strftime('%d %B %Y at %H:%M')}
- Message: {disconnection_request.message or 'No message provided'}

Please log in to your PsychPATH dashboard to review and respond to this request.

Best regards,
PsychPATH System
    """
    
    return {
        'subject': subject,
        'body': body.strip()
    }

def get_disconnection_response_email_template(disconnection_request, action):
    """Generate email content for disconnection responses"""
    supervisee_name = f"{disconnection_request.supervisee.profile.first_name} {disconnection_request.supervisee.profile.last_name}"
    supervisor_name = f"{disconnection_request.supervisor.profile.first_name} {disconnection_request.supervisor.profile.last_name}"
    role_text = "Primary" if disconnection_request.role == "PRIMARY" else "Secondary"
    
    if action == 'approved':
        subject = f"Disconnection Request Approved - {supervisor_name}"
        body = f"""
Dear {supervisee_name},

Your disconnection request from {supervisor_name} has been approved.

Details:
- Supervisor: {supervisor_name}
- Role: {role_text} Supervisor
- Approved: {disconnection_request.responded_at.strftime('%d %B %Y at %H:%M')}
- Response: {disconnection_request.response_notes or 'No additional notes'}

Your supervision relationship with {supervisor_name} has been ended. You may now seek a new {role_text.lower()} supervisor if needed.

Best regards,
PsychPATH System
        """
    else:  # declined
        subject = f"Disconnection Request Declined - {supervisor_name}"
        body = f"""
Dear {supervisee_name},

Your disconnection request from {supervisor_name} has been declined.

Details:
- Supervisor: {supervisor_name}
- Role: {role_text} Supervisor
- Declined: {disconnection_request.responded_at.strftime('%d %B %Y at %H:%M')}
- Response: {disconnection_request.response_notes or 'No additional notes'}

Your supervision relationship with {supervisor_name} will continue as before.

Best regards,
PsychPATH System
        """
    
    return {
        'subject': subject,
        'body': body.strip()
    }
