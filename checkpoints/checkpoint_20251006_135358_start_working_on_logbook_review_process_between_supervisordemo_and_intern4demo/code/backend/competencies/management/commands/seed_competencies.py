from django.core.management.base import BaseCommand
from competencies.models import Competency


class Command(BaseCommand):
    help = 'Seed the database with AHPRA 8 Core Competencies for General Registration (post-Dec 1, 2025)'

    def handle(self, *args, **options):
        competencies_data = [
            {
                'code': 'C1',
                'title': 'Applies and builds scientific knowledge of psychology to inform safe and effective practice',
                'description': 'Possesses foundational and advanced understanding of psychological concepts, constructs, theories, and evidence-based practices. Applies a scientific, culturally informed, and evidence-based approach to psychological practice and evaluation.',
                'descriptors': [
                    '1.1 Possesses knowledge of psychological concepts, constructs, theories, epistemologies, models of intervention and methods.',
                    '1.2 Critically evaluates and appraises levels of scientific evidence from psychology and relevant contemporary research to guide and inform evidence-based practice.',
                    '1.3 Understands philosophical, theoretical and methodological foundations of scientific methods and applies the appropriate method.',
                    '1.4 Applies a scientific, culturally informed and evidence-based approach to psychological practice and outcome evaluation.',
                    '1.5 Possesses the understanding and ability to design and conduct ethical research relevant to cultural and professional contexts.'
                ]
            },
            {
                'code': 'C2',
                'title': 'Practises ethically and professionally',
                'description': 'Demonstrates personal accountability, adherence to ethical standards, legal obligations, risk management and proactive management of ethical dilemmas.',
                'descriptors': [
                    '2.1 Accepts personal responsibility for professional conduct.',
                    '2.2 Aligns conduct with the profession\'s accepted ethical and professional standards.',
                    '2.3 Adheres to relevant legal and regulatory requirements.',
                    '2.4 Explains ethical obligations and decision-making to relevant others.',
                    '2.5 Reasonably foresees the outcomes of decisions and conduct.',
                    '2.6 Proactively manages ethical dilemmas using sound ethical decision-making processes.',
                    '2.7 Practises within the boundaries of professional competence.',
                    '2.8 Maintains competence as a psychologist.',
                    '2.9 Regularly consults with peers, supervisors, and/or other relevant sources.',
                    '2.10 Identifies, assesses and manages risks effectively and responsibly.'
                ]
            },
            {
                'code': 'C3',
                'title': 'Exercises professional reflexivity, deliberate practice and self-care',
                'description': 'Demonstrates continuous reflection, reflexivity, and improvement through self-assessment, peer feedback, and recognition of personal limits.',
                'descriptors': [
                    '3.1 Understands parameters underpinning professional competence and articulates the necessary knowledge, skills, and attributes.',
                    '3.2 Recognises the limits of own competence and refers to other practitioners.',
                    '3.3 Critically evaluates the effectiveness of own professional practice, including self-assessment.',
                    '3.4 Engages in reflection and reflexivity on culture, values, beliefs and biases, adapting practice accordingly.',
                    '3.5 Engages in critical self-reflection within disciplinary knowledge and professional context.',
                    '3.6 Identifies and implements actions for professional improvement and identity development.',
                    '3.7 Monitors and manages self-care to sustain professional wellbeing.'
                ]
            },
            {
                'code': 'C4',
                'title': 'Conducts psychological assessments',
                'description': 'Plans, administers and interprets culturally safe, evidence-based assessments across a wide range of psychological domains and populations.',
                'descriptors': [
                    '4.1 Understands strengths and limitations of assessment methods and delivery modes across the lifespan and contexts.',
                    '4.2 Identifies assessment needs, selects appropriate tools and methods.',
                    '4.3 Collaboratively develops assessment goals.',
                    '4.4 Administers assessments for cognitive, psychological, risk, vocational, family and workplace functioning.',
                    '4.5 Scores and interprets results accurately.',
                    '4.6 Formulates assessment findings.',
                    '4.7 Provides meaningful feedback to clients and others.',
                    '4.8 Integrates feedback from consumers and stakeholders.',
                    '4.9 Identifies and manages risks inherent in assessments.'
                ]
            },
            {
                'code': 'C5',
                'title': 'Conducts psychological interventions',
                'description': 'Implements and evaluates culturally safe, evidence-informed psychological interventions in collaboration with clients.',
                'descriptors': [
                    '5.1 Possesses knowledge of intervention types and delivery methods relevant across contexts and lifespans.',
                    '5.2 Uses diagnosis, formulation, and preferences to develop intervention plans.',
                    '5.3 Selects and implements context-sensitive, goal-directed interventions.',
                    '5.4 Informs clients of risks and benefits tailored to their situation.',
                    '5.5 Conducts culturally safe interventions that address psychological disorders, support systems, and reduce risk.',
                    '5.6 Evaluates progress and effectiveness based on client feedback and goals.',
                    '5.7 Revises interventions as required.'
                ]
            },
            {
                'code': 'C6',
                'title': 'Communicates and relates to others effectively and appropriately',
                'description': 'Communicates professionally with diverse clients, colleagues and stakeholders, using appropriate modalities and maintaining respectful relationships.',
                'descriptors': [
                    '6.1 Communicates effectively and professionally across a range of audiences.',
                    '6.2 Clarifies and communicates psychologist\'s role.',
                    '6.3 Provides relevant and timely feedback to clients and others.',
                    '6.4 Uses appropriate communication modes, aware of limitations.',
                    '6.5 Maintains safe, respectful client relationships.',
                    '6.6 Maintains collegial and respectful relationships with peers.',
                    '6.7 Works collaboratively and refers when appropriate.',
                    '6.8 Understands team roles and engages in interdisciplinary collaboration.'
                ]
            },
            {
                'code': 'C7',
                'title': 'Demonstrates a health equity and human rights approach when working with people from diverse groups',
                'description': 'Practises inclusively and respectfully with clients from all backgrounds, adapting practice to meet diverse needs and address systemic inequities.',
                'descriptors': [
                    '7.1 Works inclusively, sensitively, and without discrimination across all diversity dimensions.',
                    '7.2 Understands history and impact of psychological theories on diverse groups and refers as appropriate.',
                    '7.3 Understands the impact of cultural identity and lived experience on wellbeing.',
                    '7.4 Reflects on own identity and positionality; commits to culturally responsive practice.',
                    '7.5 Learns from clients and their lived experience.',
                    '7.6 Adapts practice to engage effectively with clients from diverse backgrounds.',
                    '7.7 Applies trauma-aware and culturally informed care.',
                    '7.8 Collaborates with other providers supporting diverse groups.',
                    '7.9 Understands and adapts for neurodiversity and disability; includes AAC use.'
                ]
            },
            {
                'code': 'C8',
                'title': 'Demonstrates a health equity and human rights approach when working with Aboriginal and Torres Strait Islander Peoples, families and communities',
                'description': 'Demonstrates understanding of colonisation\'s impacts and applies culturally safe, trauma-informed care in partnership with Aboriginal Peoples.',
                'descriptors': [
                    '8.1 Understands the historical, political, social and cultural context of Aboriginal and Torres Strait Islander Peoples.',
                    '8.2 Applies culturally responsive healthcare acknowledging diversity among Aboriginal Peoples.',
                    '8.3 Applies principles of culturally safe care.',
                    '8.4 Applies principles of trauma-aware, culturally informed care.',
                    '8.5 Learns from Aboriginal and Torres Strait Islander cultures and knowledges.',
                    '8.6 Supports self-determined decision-making in Aboriginal health contexts.',
                    '8.7 Engages in consultation and collaboration with Aboriginal Peoples and organisations.'
                ]
            }
        ]

        created_count = 0
        updated_count = 0

        for competency_data in competencies_data:
            competency, created = Competency.objects.get_or_create(
                code=competency_data['code'],
                defaults={
                    'title': competency_data['title'],
                    'description': competency_data['description'],
                    'descriptors': competency_data['descriptors']
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created competency: {competency.code} - {competency.title}')
                )
            else:
                # Update existing competency if data has changed
                if (competency.title != competency_data['title'] or 
                    competency.description != competency_data['description'] or
                    competency.descriptors != competency_data['descriptors']):
                    
                    competency.title = competency_data['title']
                    competency.description = competency_data['description']
                    competency.descriptors = competency_data['descriptors']
                    competency.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Updated competency: {competency.code} - {competency.title}')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS(f'Competency already exists: {competency.code} - {competency.title}')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSeeding complete! Created: {created_count}, Updated: {updated_count}, Total: {Competency.objects.count()}'
            )
        )
