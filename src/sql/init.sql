-- DROP TABLES
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS gift_cards;
DROP TABLE IF EXISTS stamp_cards;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS businesses;
DROP TABLE IF EXISTS user_notification_preferences;
DROP TABLE IF EXISTS users;

-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NULL,
    email TEXT NOT NULL UNIQUE,
    auth_provider_id TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- USER NOTIFICATION PREFERENCES (one-to-one)
CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    quiet_hours_start TIME NULL,
    quiet_hours_end TIME NULL,
    notify_window_days TEXT[] NULL,
    general_notification_window_start TIME NULL,
    general_notification_window_end TIME NULL,
    daily_notification_cap INT NULL,
    daily_notification_counter INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- BUSINESS (represents a chain or individual vendor)
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('restaurant', 'cafe', 'retail', 'other')),
    deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- LOCATIONS (one-to-many from business)
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geofence_radius DOUBLE PRECISION NOT NULL DEFAULT 150,
    deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- STAMP CARDS (user can have many)
CREATE TABLE stamp_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID NULL REFERENCES locations(id) ON DELETE CASCADE,
    nickname TEXT NULL,
    notes TEXT NULL,
    stamps_needed INT NOT NULL DEFAULT 0,
    stamps_acquired INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'redeemed', 'expired', 'cancelled')),
    notify_window_days TEXT[] NULL,
    notify_window_start_time TIME NULL,
    notify_window_end_time TIME NULL,
    notification_time_sent TIMESTAMP WITH TIME ZONE NULL,
    notification_cooldown_time INT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE NULL,
    deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- STAMP EVENTS (append-only log of stamp activity)
CREATE TABLE stamp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stamp_card_id UUID NOT NULL REFERENCES stamp_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- GIFT CARDS (user can have many)
CREATE TABLE gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    location_id UUID NULL REFERENCES locations(id) ON DELETE CASCADE,
    nickname TEXT NULL,
    notes TEXT NULL,
    initial_balance NUMERIC NOT NULL,
    current_balance NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    notify_window_days TEXT[] NULL,
    notify_window_start_time TIME NULL,
    notify_window_end_time TIME NULL,
    notification_time_sent TIMESTAMP WITH TIME ZONE NULL,
    notification_cooldown_time INT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE NULL,
    deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- NOTIFICATIONS (tied to a user and optionally a card and location)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stamp_card_id UUID NULL REFERENCES stamp_cards(id) ON DELETE SET NULL,
    gift_card_id UUID NULL REFERENCES gift_cards(id) ON DELETE SET NULL,
    location_id UUID NULL REFERENCES locations(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')), 
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    subject TEXT NULL,
    body TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);