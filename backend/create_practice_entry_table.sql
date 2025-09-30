CREATE TABLE IF NOT EXISTS registrar_logbook_registrarpracticeentry (
    id TEXT PRIMARY KEY,
    program_id INTEGER NOT NULL,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER NOT NULL,
    dcc_minutes INTEGER NOT NULL DEFAULT 0,
    dcc_categories TEXT DEFAULT '[]',
    setting VARCHAR(20) NOT NULL,
    modality VARCHAR(20) NOT NULL,
    client_code VARCHAR(10) NOT NULL,
    client_age_band VARCHAR(10) NOT NULL,
    presenting_issue VARCHAR(120),
    tasks TEXT NOT NULL,
    competency_tags TEXT DEFAULT '[]',
    observed BOOLEAN DEFAULT FALSE,
    supervisor_followup_date DATE,
    evidence_files TEXT DEFAULT '[]',
    created_by_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES registrar_logbook_registrarprogram (id),
    FOREIGN KEY (created_by_id) REFERENCES auth_user (id)
);

CREATE INDEX IF NOT EXISTS idx_rpe_program_date ON registrar_logbook_registrarpracticeentry (program_id, date);
CREATE INDEX IF NOT EXISTS idx_rpe_program_dcc ON registrar_logbook_registrarpracticeentry (program_id, dcc_minutes);
