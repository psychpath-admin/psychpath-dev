CREATE TABLE IF NOT EXISTS registrar_logbook_supervisorprofile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    is_BAS BOOLEAN DEFAULT FALSE,
    aope_endorsements TEXT DEFAULT '[]',
    years_endorsed TEXT DEFAULT '{}',
    is_registrar_principal_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_user (id)
);
