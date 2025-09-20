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

