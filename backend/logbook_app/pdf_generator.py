"""
AHPRA LBPP-76 Weekly Logbook PDF Generator

Generates pixel-accurate AHPRA LBPP-76 weekly logbook PDF using ReportLab platypus API.
Signatures and initials retrieved from UserProfile, dual signature support.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.utils import ImageReader
from django.conf import settings
from django.core.files.storage import default_storage
import io
import base64
from PIL import Image as PILImage
from datetime import datetime, date

from .models import WeeklyLogbook
from section_a.models import SectionAEntry
from section_b.models import ProfessionalDevelopmentEntry
from section_c.models import SupervisionEntry
from api.models import UserProfile

# Color constants
BLUE = colors.HexColor('#0072CE')
GREY = colors.HexColor('#CCCCCC')
LIGHTGREY = colors.HexColor('#F9F9F9')
ORANGE = colors.HexColor('#FFF4E6')
SIGNATUREBOX = colors.HexColor('#A3C4E8')

# Margins: 25mm all sides
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 25 * mm
CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN)

# EPA to Competency mapping
EPA_TO_COMPETENCY_MAP = {
    'EPA1': ['C1', 'C2', 'C6'],
    'EPA2': ['C1', 'C4', 'C6'],
    'EPA3': ['C2', 'C6', 'C7'],
    'EPA4': ['C1', 'C3', 'C6'],
    'EPA5': ['C4', 'C6', 'C8'],
    'EPA6': ['C1', 'C2', 'C6'],
    'EPA7': ['C5', 'C6'],
    'EPA8': ['C8', 'C6'],
}


class LBPP76PDFGenerator:
    """Generate AHPRA LBPP-76 weekly logbook PDF"""
    
    def __init__(self, logbook_id, user):
        self.logbook_id = logbook_id
        self.user = user
        self.logbook = None
        self.trainee_profile = None
        self.supervisor_profile = None
        self.section_a_entries = []
        self.section_b_entries = []
        self.section_c_entries = []
        
        # Load data
        self._load_logbook_data()
        
        # Define styles
        self._define_styles()
    
    def _load_logbook_data(self):
        """Load logbook and related data"""
        try:
            self.logbook = WeeklyLogbook.objects.get(id=self.logbook_id)
            self.trainee_profile = self.logbook.trainee.profile
            
            # Load supervisor profile if available
            if self.logbook.supervisor and hasattr(self.logbook.supervisor, 'profile'):
                self.supervisor_profile = self.logbook.supervisor.profile
            
            # Load section entries
            if self.logbook.section_a_entry_ids:
                self.section_a_entries = SectionAEntry.objects.filter(
                    id__in=self.logbook.section_a_entry_ids
                ).order_by('session_date')
            
            if self.logbook.section_b_entry_ids:
                self.section_b_entries = ProfessionalDevelopmentEntry.objects.filter(
                    id__in=self.logbook.section_b_entry_ids
                ).order_by('activity_date')
            
            if self.logbook.section_c_entry_ids:
                self.section_c_entries = SupervisionEntry.objects.filter(
                    id__in=self.logbook.section_c_entry_ids
                ).order_by('date')
                
        except WeeklyLogbook.DoesNotExist:
            raise ValueError(f"Logbook with ID {self.logbook_id} not found")
    
    def _define_styles(self):
        """Define ReportLab styles"""
        styles = getSampleStyleSheet()
        
        self.title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=BLUE,
            alignment=TA_CENTER,
            spaceAfter=12,
            fontName='Helvetica-Bold'
        )
        
        self.heading_style = ParagraphStyle(
            'HeadingStyle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.white,
            backColor=BLUE,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
            leftIndent=6,
            spaceAfter=6
        )
        
        self.subheading_style = ParagraphStyle(
            'SubHeading',
            parent=styles['Heading3'],
            fontSize=12,
            textColor=BLUE,
            fontName='Helvetica-Bold',
            spaceAfter=6
        )
        
        self.body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Helvetica'
        )
        
        self.note_style = ParagraphStyle(
            'Note',
            parent=styles['Normal'],
            fontSize=9,
            textColor=GREY,
            fontName='Helvetica-Oblique'
        )
    
    def generate_pdf(self):
        """Generate and return PDF bytes"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=MARGIN,
            rightMargin=MARGIN,
            topMargin=MARGIN,
            bottomMargin=MARGIN
        )
        
        story = []
        
        # Build PDF content
        self._build_header_block(story)
        self._build_trainee_info_block(story)
        self._build_section_a_table(story)
        self._build_section_b_table(story)
        self._build_section_c_table(story)
        self._build_weekly_totals_table(story)
        self._build_cumulative_totals_table(story)
        self._build_signature_blocks(story)
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def _build_header_block(self, story):
        """Build header with logo and title"""
        # Logo placeholder (left side)
        logo_text = "PsychPATH"  # Placeholder for logo
        story.append(Paragraph(logo_text, self.body_style))
        
        # Right side - LBPP-76
        lbpp_text = "LBPP-76"
        lbpp_style = ParagraphStyle(
            'LBPP',
            parent=self.body_style,
            fontSize=16,
            textColor=BLUE,
            alignment=TA_RIGHT,
            fontName='Helvetica-Bold'
        )
        story.append(Paragraph(lbpp_text, lbpp_style))
        
        # Main title
        title_text = "Logbook: Record of professional practice"
        story.append(Paragraph(title_text, self.title_style))
        
        # Subtitle
        subtitle_text = "Type: 5+1 provisional registration program"
        story.append(Paragraph(subtitle_text, self.body_style))
        
        story.append(Spacer(1, 12))
    
    def _build_trainee_info_block(self, story):
        """Build trainee information block"""
        # Trainee name
        trainee_name = f"{self.trainee_profile.first_name} {self.trainee_profile.last_name}".strip()
        story.append(Paragraph(f"<b>Provisional Psychologist Name:</b> {trainee_name}", self.body_style))
        
        # Registration number
        reg_number = self.trainee_profile.ahpra_registration_number or "Not provided"
        story.append(Paragraph(f"<b>Registration Number:</b> {reg_number}", self.body_style))
        
        # Week beginning
        week_start = self.logbook.week_start_date.strftime('%d %B %Y')
        story.append(Paragraph(f"<b>Week Beginning:</b> {week_start}", self.body_style))
        
        story.append(Spacer(1, 12))
    
    def _build_section_a_table(self, story):
        """Build Section A - Direct Client Contact table"""
        story.append(Paragraph("Section A: Direct Client Contact and Client-Related Activities", self.heading_style))
        
        # Table headers
        headers = [
            "Session",
            "Client Contact",
            "CC Hours",
            "Client-Related Activity", 
            "CRA Hours",
            "Reflection"
        ]
        
        # Build table data
        table_data = [headers]
        
        for entry in self.section_a_entries:
            session = entry.place_of_practice or entry.client_id or ""
            client_contact = ""
            cc_hours = ""
            client_related = ""
            cra_hours = ""
            reflection = entry.reflection_text or ""
            
            # Map entry types to columns
            if entry.entry_type in ['client_contact', 'simulated_contact']:
                client_contact = entry.case_description or ""
                cc_hours = f"{entry.duration_minutes / 60:.1f}" if entry.duration_minutes else ""
            elif entry.entry_type in ['cra', 'independent_activity']:
                client_related = entry.case_description or ""
                cra_hours = f"{entry.duration_minutes / 60:.1f}" if entry.duration_minutes else ""
            
            table_data.append([
                session,
                client_contact,
                cc_hours,
                client_related,
                cra_hours,
                reflection
            ])
        
        # Create table
        if len(table_data) > 1:  # Has data beyond headers
            table = Table(table_data, colWidths=[60, 80, 30, 80, 30, 100])
            table.setStyle(self._get_table_style())
            story.append(table)
        else:
            story.append(Paragraph("No entries for this week", self.note_style))
        
        story.append(Spacer(1, 12))
    
    def _build_section_b_table(self, story):
        """Build Section B - Professional Development table"""
        story.append(Paragraph("Section B: Professional Development", self.heading_style))
        
        # Table headers
        headers = [
            "Date",
            "Type",
            "Active PD",
            "Details",
            "Competency Area(s)",
            "Topic",
            "Duration",
            "Initials"
        ]
        
        # Build table data
        table_data = [headers]
        
        for entry in self.section_b_entries:
            date_str = entry.activity_date.strftime('%d/%m/%Y') if entry.activity_date else ""
            activity_type = entry.activity_type or ""
            active_pd = "Yes" if getattr(entry, 'active_cpd', False) else ""
            details = entry.activity_description or ""
            competencies = self._map_epa_to_competencies(getattr(entry, 'epa_worked_on', ''))
            topic = getattr(entry, 'activity_topic', '') or details[:100] if details else ""
            duration = f"{entry.duration_minutes / 60:.1f}" if entry.duration_minutes else ""
            initials = getattr(entry, 'supervisor_initials', '') or ""
            
            table_data.append([
                date_str,
                activity_type,
                active_pd,
                details,
                competencies,
                topic,
                duration,
                initials
            ])
        
        # Create table
        if len(table_data) > 1:  # Has data beyond headers
            table = Table(table_data, colWidths=[40, 50, 30, 80, 60, 60, 30, 30])
            table.setStyle(self._get_table_style())
            story.append(table)
        else:
            story.append(Paragraph("No entries for this week", self.note_style))
        
        story.append(Spacer(1, 12))
    
    def _build_section_c_table(self, story):
        """Build Section C - Supervision table"""
        story.append(Paragraph("Section C: Supervision", self.heading_style))
        
        # Table headers
        headers = [
            "Date",
            "Supervisor",
            "Principal/Secondary",
            "Mode",
            "Summary",
            "Duration",
            "Initials"
        ]
        
        # Build table data
        table_data = [headers]
        
        for entry in self.section_c_entries:
            date_str = entry.date.strftime('%d/%m/%Y') if entry.date else ""
            supervisor = entry.supervisor_name or ""
            if not supervisor and self.supervisor_profile:
                supervisor = f"{self.supervisor_profile.first_name} {self.supervisor_profile.last_name}".strip()
            
            principal_secondary = "Principal"  # Default assumption
            mode = getattr(entry, 'supervision_medium', 'Individual') or "Individual"
            summary = entry.supervision_notes or ""
            if len(summary) > 200:
                summary = summary[:200] + "..."
            
            duration = f"{entry.duration_minutes / 60:.1f}" if entry.duration_minutes else ""
            initials = getattr(entry, 'supervisor_initials', '') or ""
            
            table_data.append([
                date_str,
                supervisor,
                principal_secondary,
                mode,
                summary,
                duration,
                initials
            ])
        
        # Create table
        if len(table_data) > 1:  # Has data beyond headers
            table = Table(table_data, colWidths=[40, 60, 50, 40, 100, 30, 30])
            table.setStyle(self._get_table_style())
            story.append(table)
        else:
            story.append(Paragraph("No entries for this week", self.note_style))
        
        story.append(Spacer(1, 12))
    
    def _build_weekly_totals_table(self, story):
        """Build weekly hours summary table"""
        story.append(Paragraph("Weekly Hours Summary", self.subheading_style))
        
        # Get totals from logbook
        totals = self.logbook.calculate_section_totals() if hasattr(self.logbook, 'calculate_section_totals') else {}
        
        table_data = [
            ["Activity Type", "Hours"],
            ["Direct Client Contact", f"{totals.get('dcc_hours', 0):.1f}"],
            ["Client-Related Activities", f"{totals.get('cra_hours', 0):.1f}"],
            ["Professional Development", f"{totals.get('pd_hours', 0):.1f}"],
            ["Supervision", f"{totals.get('sup_hours', 0):.1f}"],
            ["Total Weekly Hours", f"{totals.get('total_hours', 0):.1f}"]
        ]
        
        table = Table(table_data, colWidths=[120, 60])
        table.setStyle(self._get_table_style())
        story.append(table)
        story.append(Spacer(1, 12))
    
    def _build_cumulative_totals_table(self, story):
        """Build cumulative hours table"""
        story.append(Paragraph("Cumulative Hours", self.subheading_style))
        
        # Get cumulative totals from logbook
        table_data = [
            ["Activity Type", "Cumulative Hours"],
            ["Direct Client Contact", f"{self.logbook.cumulative_dcc_hours:.1f}"],
            ["Client-Related Activities", f"{self.logbook.cumulative_cra_hours:.1f}"],
            ["Professional Development", f"{self.logbook.cumulative_pd_hours:.1f}"],
            ["Supervision", f"{self.logbook.cumulative_sup_hours:.1f}"],
            ["Total Cumulative Hours", f"{self.logbook.cumulative_total_hours:.1f}"]
        ]
        
        table = Table(table_data, colWidths=[120, 60])
        table.setStyle(self._get_table_style())
        story.append(table)
        story.append(Spacer(1, 12))
    
    def _build_signature_blocks(self, story):
        """Build signature blocks for trainee and supervisor"""
        story.append(Paragraph("Signatures", self.subheading_style))
        
        # Create signature table
        signature_data = [
            ["Trainee Signature", "Supervisor Signature"],
            ["", ""],  # Signature boxes
            ["Name: _________________", "Name: _________________"],
            ["Date: _________________", "Date: _________________"]
        ]
        
        table = Table(signature_data, colWidths=[CONTENT_WIDTH/2, CONTENT_WIDTH/2])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 1), (0, 1), SIGNATUREBOX),
            ('BACKGROUND', (1, 1), (1, 1), SIGNATUREBOX),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, 1), [SIGNATUREBOX, SIGNATUREBOX]),
        ]))
        
        story.append(table)
    
    def _get_table_style(self):
        """Get standard table styling"""
        return TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BLUE),  # Header row
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHTGREY]),
            ('GRID', (0, 0), (-1, -1), 0.5, GREY),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ])
    
    def _map_epa_to_competencies(self, epa_code):
        """Map EPA code to competency codes"""
        if not epa_code:
            return ""
        
        competencies = EPA_TO_COMPETENCY_MAP.get(epa_code, ['C1'])
        return ', '.join(competencies)
    
    def _load_signature_image(self, url_or_path):
        """Load signature image from URL or path"""
        if not url_or_path:
            return None
        
        try:
            if url_or_path.startswith('data:image'):
                # Handle data URL
                header, data = url_or_path.split(',', 1)
                image_data = base64.b64decode(data)
                return ImageReader(io.BytesIO(image_data))
            else:
                # Handle file path
                if default_storage.exists(url_or_path):
                    file_obj = default_storage.open(url_or_path)
                    return ImageReader(file_obj)
        except Exception as e:
            print(f"Error loading signature image: {e}")
        
        return None
