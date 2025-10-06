#!/usr/bin/env python
import os
import sys
import django
import uuid

# Add the backend directory to the Python path
sys.path.append('/Users/macdemac/Local Sites/PsychPATH/backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ.setdefault('USE_SQLITE', '1')
django.setup()

from epas.models import EPA

# All EPA data from the user's request
epas_data = [
    {
        "code": "C1-101",
        "title": "Real-World Task Demonstrating Descriptor 1.1",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 1.1 under C1.",
        "descriptors": ["1.1"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C1-101 M3—descriptor 1.1",
        "m3_behaviours": [
            "white exploit distributed bandwidth",
            "half facilitate efficient portals",
            "continue embrace 24/365 paradigms"
        ],
        "prompt": "How did you demonstrate descriptor 1.1 in this scenario?"
    },
    {
        "code": "C1-102",
        "title": "Real-World Task Demonstrating Descriptor 1.2",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 1.2 under C1.",
        "descriptors": ["1.2"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C1-102 M3—descriptor 1.2",
        "m3_behaviours": [
            "sport generate dynamic channels",
            "draw enable plug-and-play markets",
            "collection architect cross-media infrastructures"
        ],
        "prompt": "How did you demonstrate descriptor 1.2 in this scenario?"
    },
    {
        "code": "C1-103",
        "title": "Real-World Task Demonstrating Descriptor 1.3",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 1.3 under C1.",
        "descriptors": ["1.3"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C1-103 M3—descriptor 1.3",
        "m3_behaviours": [
            "why mesh mission-critical e-commerce",
            "good engage value-added niches",
            "off harness out-of-the-box e-markets"
        ],
        "prompt": "How did you demonstrate descriptor 1.3 in this scenario?"
    },
    {
        "code": "C1-104",
        "title": "Real-World Task Demonstrating Descriptor 1.4",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 1.4 under C1.",
        "descriptors": ["1.4"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C1-104 M3—descriptor 1.4",
        "m3_behaviours": [
            "agency utilize clicks-and-mortar communities",
            "few morph magnetic models",
            "police scale real-time networks"
        ],
        "prompt": "How did you demonstrate descriptor 1.4 in this scenario?"
    },
    {
        "code": "C1-105",
        "title": "Real-World Task Demonstrating Descriptor 1.5",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 1.5 under C1.",
        "descriptors": ["1.5"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C1-105 M3—descriptor 1.5",
        "m3_behaviours": [
            "better streamline transparent paradigms",
            "total mesh plug-and-play functionalities",
            "western innovate impactful e-commerce"
        ],
        "prompt": "How did you demonstrate descriptor 1.5 in this scenario?"
    },
    {
        "code": "C2-101",
        "title": "Real-World Task Demonstrating Descriptor 2.1",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 2.1 under C2.",
        "descriptors": ["2.1"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C2-101 M3—descriptor 2.1",
        "m3_behaviours": [
            "between incentivize efficient models",
            "various facilitate integrated e-commerce",
            "save extend web-enabled convergence"
        ],
        "prompt": "How did you demonstrate descriptor 2.1 in this scenario?"
    },
    {
        "code": "C2-102",
        "title": "Real-World Task Demonstrating Descriptor 2.2",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 2.2 under C2.",
        "descriptors": ["2.2"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C2-102 M3—descriptor 2.2",
        "m3_behaviours": [
            "someone expedite compelling channels",
            "fear evolve best-of-breed users",
            "its deploy front-end initiatives"
        ],
        "prompt": "How did you demonstrate descriptor 2.2 in this scenario?"
    },
    {
        "code": "C2-103",
        "title": "Real-World Task Demonstrating Descriptor 2.3",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 2.3 under C2.",
        "descriptors": ["2.3"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C2-103 M3—descriptor 2.3",
        "m3_behaviours": [
            "even reinvent granular web-readiness",
            "soon optimize rich platforms",
            "take iterate web-enabled e-services"
        ],
        "prompt": "How did you demonstrate descriptor 2.3 in this scenario?"
    },
    {
        "code": "C2-104",
        "title": "Real-World Task Demonstrating Descriptor 2.4",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 2.4 under C2.",
        "descriptors": ["2.4"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C2-104 M3—descriptor 2.4",
        "m3_behaviours": [
            "fact drive scalable web-readiness",
            "would leverage granular channels",
            "message transform synergistic portals"
        ],
        "prompt": "How did you demonstrate descriptor 2.4 in this scenario?"
    },
    {
        "code": "C2-105",
        "title": "Real-World Task Demonstrating Descriptor 2.5",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 2.5 under C2.",
        "descriptors": ["2.5"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C2-105 M3—descriptor 2.5",
        "m3_behaviours": [
            "skill synthesize collaborative portals",
            "water grow B2B solutions",
            "fill exploit revolutionary paradigms"
        ],
        "prompt": "How did you demonstrate descriptor 2.5 in this scenario?"
    },
    {
        "code": "C2-106",
        "title": "Real-World Task Demonstrating Descriptor 2.6",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 2.6 under C2.",
        "descriptors": ["2.6"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C2-106 M3—descriptor 2.6",
        "m3_behaviours": [
            "what disintermediate back-end platforms",
            "mention architect synergistic synergies",
            "record benchmark turn-key e-business"
        ],
        "prompt": "How did you demonstrate descriptor 2.6 in this scenario?"
    },
    {
        "code": "C2-107",
        "title": "Real-World Task Demonstrating Descriptor 2.7",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 2.7 under C2.",
        "descriptors": ["2.7"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C2-107 M3—descriptor 2.7",
        "m3_behaviours": [
            "either integrate cross-platform e-commerce",
            "lay incubate cutting-edge methodologies",
            "name brand one-to-one technologies"
        ],
        "prompt": "How did you demonstrate descriptor 2.7 in this scenario?"
    },
    {
        "code": "C2-108",
        "title": "Real-World Task Demonstrating Descriptor 2.8",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 2.8 under C2.",
        "descriptors": ["2.8"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C2-108 M3—descriptor 2.8",
        "m3_behaviours": [
            "billion benchmark 24/365 experiences",
            "tell syndicate scalable users",
            "raise visualize e-business methodologies"
        ],
        "prompt": "How did you demonstrate descriptor 2.8 in this scenario?"
    },
    {
        "code": "C2-109",
        "title": "Real-World Task Demonstrating Descriptor 2.9",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 2.9 under C2.",
        "descriptors": ["2.9"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C2-109 M3—descriptor 2.9",
        "m3_behaviours": [
            "big facilitate innovative schemas",
            "significant implement 24/365 methodologies",
            "address target e-business supply-chains"
        ],
        "prompt": "How did you demonstrate descriptor 2.9 in this scenario?"
    },
    {
        "code": "C2-110",
        "title": "Real-World Task Demonstrating Descriptor 2.10",
        "description": "Perform a practical activity that demonstrates the competency defined in descriptor 2.10 under C2.",
        "descriptors": ["2.10"],
        "milestones": ["L1", "L2", "L3", "L4"],
        "tag": "EPA C2-110 M3—descriptor 2.10",
        "m3_behaviours": [
            "step unleash front-end methodologies",
            "like streamline 24/7 channels",
            "smile incentivize collaborative functionalities"
        ],
        "prompt": "How did you demonstrate descriptor 2.10 in this scenario?"
    }
]

def main():
    created_count = 0
    updated_count = 0
    
    for epa_data in epas_data:
        epa, created = EPA.objects.get_or_create(
            code=epa_data['code'],
            defaults={
                'id': str(uuid.uuid4()),
                'title': epa_data['title'],
                'description': epa_data['description'],
                'descriptors': epa_data['descriptors'],
                'milestones': epa_data['milestones'],
                'tag': epa_data['tag'],
                'm3_behaviours': epa_data['m3_behaviours'],
                'prompt': epa_data['prompt']
            }
        )
        
        if created:
            created_count += 1
            print(f'Created EPA: {epa.code} - {epa.title}')
        else:
            # Update existing EPA if data has changed
            if (epa.title != epa_data['title'] or 
                epa.description != epa_data['description'] or
                epa.descriptors != epa_data['descriptors'] or
                epa.milestones != epa_data.get('milestones', []) or
                epa.tag != epa_data.get('tag', '') or
                epa.m3_behaviours != epa_data.get('m3_behaviours', []) or
                epa.prompt != epa_data.get('prompt', '')):
                
                epa.title = epa_data['title']
                epa.description = epa_data['description']
                epa.descriptors = epa_data['descriptors']
                epa.milestones = epa_data.get('milestones', [])
                epa.tag = epa_data.get('tag', '')
                epa.m3_behaviours = epa_data.get('m3_behaviours', [])
                epa.prompt = epa_data.get('prompt', '')
                epa.save()
                updated_count += 1
                print(f'Updated EPA: {epa.code} - {epa.title}')
            else:
                print(f'EPA already exists: {epa.code} - {epa.title}')
    
    print(f'\nSeeding complete! Created: {created_count}, Updated: {updated_count}, Total: {EPA.objects.count()}')

if __name__ == '__main__':
    main()
