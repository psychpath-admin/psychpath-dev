-- Create RegistrarProgram table
CREATE TABLE IF NOT EXISTS registrar_logbook_registrarprogram (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    aope VARCHAR(50) NOT NULL,
    qualification_tier VARCHAR(30) NOT NULL,
    fte_fraction DECIMAL(3,2) DEFAULT 1.0,
    start_date DATE NOT NULL,
    expected_end_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'draft',
    targets_practice_hrs INTEGER NOT NULL,
    targets_supervision_hrs INTEGER NOT NULL,
    targets_cpd_hrs INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, aope, start_date),
    FOREIGN KEY (user_id) REFERENCES auth_user (id)
);

-- Create RegistrarPracticeEntry table (already created)
-- CREATE TABLE IF NOT EXISTS registrar_logbook_registrarpracticeentry ...

-- Create RegistrarSupervisionEntry table
CREATE TABLE IF NOT EXISTS registrar_logbook_registrarsupervisionentry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    mode VARCHAR(20) DEFAULT 'in_person',
    type VARCHAR(20) DEFAULT 'individual',
    supervisor_id INTEGER NOT NULL,
    supervisor_category VARCHAR(50) NOT NULL,
    topics TEXT,
    observed BOOLEAN DEFAULT FALSE,
    shorter_than_60min BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES registrar_logbook_registrarprogram (id),
    FOREIGN KEY (supervisor_id) REFERENCES auth_user (id)
);

-- Create RegistrarCpdEntry table
CREATE TABLE IF NOT EXISTS registrar_logbook_registrarcpdentry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    date DATE NOT NULL,
    provider VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    hours DECIMAL(4,2) NOT NULL,
    is_active_cpd BOOLEAN DEFAULT TRUE,
    learning_goal TEXT,
    reflection TEXT,
    evidence_files TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES registrar_logbook_registrarprogram (id)
);

-- Create CompetencyFramework table
CREATE TABLE IF NOT EXISTS registrar_logbook_competencyframework (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aope VARCHAR(50) NOT NULL,
    category_code VARCHAR(20) NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE(aope, category_code)
);

-- Create ProgressSnapshot table
CREATE TABLE IF NOT EXISTS registrar_logbook_progresssnapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES registrar_logbook_registrarprogram (id)
);

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS registrar_logbook_auditlog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER NOT NULL,
    program_id INTEGER NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id TEXT,
    action VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (actor_id) REFERENCES auth_user (id),
    FOREIGN KEY (program_id) REFERENCES registrar_logbook_registrarprogram (id)
);
