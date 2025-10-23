export interface MySupervisionAgenda {
  id: number;
  trainee: number;
  trainee_email: string;
  week_starting: string;
  week_starting_display: string;
  created_at: string;
  updated_at: string;
  items: AgendaItem[];
}

export interface AgendaItem {
  id: number;
  agenda: number;
  title: string;
  detail: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'discussed' | 'carried' | 'discarded';
  source_type: 'A' | 'B' | 'FREE';
  source_entry_id?: number;
  source_field: string;
  source_excerpt: string;
  my_reflection: string;
  discussed_on?: string;
  imported_to_section_c: boolean;
  created_at: string;
  updated_at: string;
}

export interface SectionCImport {
  id: number;
  section_c_id: string;
  agenda_item: number;
  entry_type: 'question' | 'comment' | 'action';
  rendered_text: string;
  created_at: string;
}

export interface CreateAgendaItemRequest {
  title: string;
  detail?: string;
  priority?: 'low' | 'medium' | 'high';
  source_type?: 'A' | 'B' | 'FREE';
  source_entry_id?: number;
  source_field?: string;
  source_excerpt?: string;
  agenda: number;
}

export interface UpdateAgendaItemRequest {
  title?: string;
  detail?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'open' | 'discussed' | 'carried' | 'discarded';
  my_reflection?: string;
  discussed_on?: string;
  imported_to_section_c?: boolean;
}

export interface ImportToSectionCRequest {
  item_ids: number[];
  section_c_id: string;
  entry_type: 'question' | 'comment' | 'action';
}