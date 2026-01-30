CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name TEXT,
    email TEXT UNIQUE NOT NULL,
    auth_provider_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_archived BOOLEAN DEFAULT false
);


CREATE TABLE gift_card (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nickname TEXT,
    vendor_place_id TEXT,
    vendor_name TEXT,
    vendor_address TEXT,
    vendor_lat DOUBLE PRECISION,
    vendor_lng DOUBLE PRECISION,
    geofence_radius INT,
    notify_window_days TEXT[],
    notify_window_start_time TIMESTAMPTZ,
    notify_window_end_time TIMESTAMPTZ,
    notification_time_sent TIMESTAMPTZ,
    notification_cooldown_time INT,
    notes TEXT,
    initial_balance INT,
    current_balance INT,
    expiration_date TIMESTAMPTZ,
    currency CHAR(3),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_archived BOOLEAN DEFAULT false
);


CREATE TABLE stamp_card (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nickname TEXT,
    vendor_place_id TEXT,
    vendor_name TEXT,
    vendor_address TEXT,
    vendor_lat DOUBLE PRECISION,
    vendor_lng DOUBLE PRECISION,
    geofence_radius INT,
    notify_window_days TEXT[],
    notify_window_start_time TIMESTAMPTZ,
    notify_window_end_time TIMESTAMPTZ,
    notification_time_sent TIMESTAMPTZ,
    notification_cooldown_time INT,
    notes TEXT,
    stamps_needed INT NOT NULL,
    stamps_acquired INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_archived BOOLEAN DEFAULT false
);


CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stamp_card_id UUID REFERENCES stamp_card(id) ON DELETE CASCADE,
    gift_card_id UUID REFERENCES gift_card(id) ON DELETE CASCADE,
    type TEXT,
    status TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    subject TEXT,
    body TEXT
);

CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    general_notification_window_start TIMESTAMPTZ,
    general_notification_window_end TIMESTAMPTZ,
    notify_window_days TEXT[],
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);